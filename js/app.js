/**
 * TRBike — Main App (Map-first)
 */

let currentProfile = null;
let unsubRides = null;
let unsubActive = null;
let lastQuote = null;
let lastRoute = null;
let searchTimeout = null;

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function show(el, on = true) {
  if (!el) return;
  el.classList.toggle("hidden", !on);
}

function toast(msg, type = "info") {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => t.classList.remove("show"), 3200);
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? "Memproses..." : btn.dataset.originalText;
}

function showStep(id) {
  ["stepSearch", "stepPins", "stepQuote", "stepSearching"].forEach((s) => {
    show($(s), s === id);
  });
}

// ===== AUTH UI =====
function openAuth() {
  show($("authModal"), true);
}
function closeAuth() {
  show($("authModal"), false);
}

function setupAuthTabs() {
  $$(".tab").forEach((tab) => {
    tab.onclick = () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isLogin = tab.dataset.tab === "login";
      show($("loginForm"), isLogin);
      show($("registerForm"), !isLogin);
      $("authMsg").textContent = "";
    };
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  $("authMsg").textContent = "";
  try {
    await loginUser($("loginEmail").value.trim(), $("loginPassword").value);
    toast("Berhasil masuk", "success");
    closeAuth();
  } catch (err) {
    $("authMsg").textContent = mapAuthError(err);
  } finally {
    setLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  setLoading(btn, true);
  $("authMsg").textContent = "";
  try {
    const name = $("regName").value.trim();
    if (name.length < 2) throw new Error("Nama terlalu pendek");
    await registerUser(name, $("regEmail").value.trim(), $("regPassword").value, $("regRole").value);
    toast("Akun berhasil dibuat", "success");
    closeAuth();
  } catch (err) {
    $("authMsg").textContent = mapAuthError(err);
  } finally {
    setLoading(btn, false);
  }
}

async function handleGoogleLogin() {
  const btn = $("googleBtn");
  setLoading(btn, true);
  $("authMsg").textContent = "";
  try {
    await loginWithGoogle($("googleRole")?.value || "passenger");
    toast("Berhasil masuk dengan Google", "success");
    closeAuth();
  } catch (err) {
    $("authMsg").textContent = mapAuthError(err);
  } finally {
    setLoading(btn, false);
  }
}

function mapAuthError(err) {
  const code = err.code || "";
  if (code.includes("email-already-in-use")) return "Email sudah terdaftar.";
  if (code.includes("invalid-email")) return "Format email tidak valid.";
  if (code.includes("weak-password")) return "Password minimal 6 karakter.";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
    return "Email atau password salah.";
  if (code.includes("popup-closed-by-user")) return "Login Google dibatalkan.";
  if (code.includes("popup-blocked")) return "Popup diblokir browser.";
  if (code.includes("operation-not-allowed")) return "Provider belum diaktifkan di Firebase.";
  if (code.includes("unauthorized-domain")) return "Domain belum diizinkan di Firebase.";
  return err.message || "Terjadi kesalahan.";
}

// ===== RENDER ROLE =====
async function renderApp() {
  currentProfile = await getCurrentUserProfile();

  if (!currentProfile) {
    show($("authOpenBtn"), true);
    show($("logoutBtn"), false);
    show($("userChip"), false);
    show($("passengerSheet"), true);
    show($("driverSheet"), false);
    showStep("stepSearch");
    return;
  }

  show($("authOpenBtn"), false);
  show($("logoutBtn"), true);
  show($("userChip"), true);
  $("userChip").textContent = currentProfile.fullName.split(" ")[0];

  if (unsubRides) unsubRides();
  if (unsubActive) unsubActive();

  if (currentProfile.role === "driver") {
    show($("passengerSheet"), false);
    show($("driverSheet"), true);
    setupDriver();
  } else {
    show($("passengerSheet"), true);
    show($("driverSheet"), false);
    setupPassenger();
  }
}

// ===== PASSENGER MAP FLOW =====
function setupPassenger() {
  showStep("stepSearch");
  $("confirmDestBtn").disabled = !getDestination();

  window.onMapPinsChanged = ({ dest }) => {
    $("confirmDestBtn").disabled = !dest;
  };

  unsubRides = listenPassengerRides(currentProfile.uid, renderPassengerRides);
}

function renderPassengerRides(rides) {
  const box = $("ordersPassenger");
  if (!rides.length) {
    box.innerHTML = '<div class="empty">Belum ada pesanan.</div>';
    return;
  }
  box.innerHTML = rides
    .slice(0, 5)
    .map((r) => {
      const canCancel = r.status === "requested";
      return `<div class="item">
        <div class="row">
          <b>${escapeHtml(r.destinationText || r.pickupText || "Order")}</b>
          <span class="badge status-${r.status}">${statusLabel(r.status)}</span>
        </div>
        <div class="meta">${r.tripDistanceKm} km · ${formatRupiah(r.fare?.total || 0)}</div>
        ${canCancel ? `<button class="btn-link" style="text-align:left;padding:6px 0" onclick="handleCancelRide('${r.id}')">Batalkan</button>` : ""}
      </div>`;
    })
    .join("");
}

window.handleCancelRide = async function (rideId) {
  if (!confirm("Batalkan order ini?")) return;
  try {
    await cancelRide(rideId, currentProfile.uid);
    toast("Order dibatalkan", "success");
  } catch (err) {
    toast(err.message, "error");
  }
};

async function onConfirmDest() {
  if (!getDestination()) {
    toast("Pilih tujuan dulu", "error");
    return;
  }
  if (!getPickup()) {
    try {
      await locateUser();
    } catch {
      toast("Izinkan lokasi untuk titik jemput", "error");
      return;
    }
  }
  showStep("stepPins");
  toast("Geser pin jika perlu, lalu Cek Tarif");
}

async function onCheckFare() {
  const pickup = getPickup();
  const dest = getDestination();
  if (!pickup || !dest) {
    toast("Titik jemput & tujuan wajib ada", "error");
    return;
  }
  if (!currentProfile) {
    openAuth();
    toast("Masuk dulu untuk cek tarif & pesan");
    return;
  }

  const btn = $("checkFareBtn");
  setLoading(btn, true);
  try {
    lastRoute = await getRouteInfo(pickup, dest);
    const tripKm = Math.max(0.5, +(lastRoute.km || 0).toFixed(1));
    // Estimasi jarak jemput driver (MVP visual) ~ 0.5–2 km
    const pickupKm = +(0.5 + Math.random() * 1.5).toFixed(1);

    const rules = await getFareRules();
    lastQuote = calculateFare(tripKm, pickupKm, "standard", rules);

    $("quoteCard").innerHTML = `
      <div class="price">${formatRupiah(lastQuote.total)}</div>
      <div class="meta">
        ~${lastRoute.minutes} mnt · ${tripKm} km perjalanan
        ${lastRoute.source === "osrm" ? "" : " (estimasi)"}
        · jemput ~${pickupKm} km
      </div>
      <div class="row"><span>BBM perjalanan</span><span>${formatRupiah(lastQuote.tripFuel)}</span></div>
      <div class="row"><span>BBM penjemputan</span><span>${formatRupiah(lastQuote.pickupFuel)}</span></div>
      <div class="row"><span>Hak driver (pool)</span><span>${formatRupiah(lastQuote.driverPool)}</span></div>
      <div class="row"><span>Layanan + pajak</span><span>${formatRupiah(lastQuote.serviceFee + lastQuote.tax)}</span></div>
      <div class="row total"><span>Total</span><span>${formatRupiah(lastQuote.total)}</span></div>
    `;
    showStep("stepQuote");
  } catch (err) {
    toast(err.message || "Gagal hitung tarif", "error");
  } finally {
    setLoading(btn, false);
  }
}

async function onFindDriver() {
  if (!currentProfile) {
    openAuth();
    return;
  }
  if (!lastQuote || !getDestination() || !getPickup()) {
    toast("Hitung tarif dulu", "error");
    return;
  }

  showStep("stepSearching");
  const dest = getDestination();
  const pickup = getPickup();
  const destLabel = $("destInput").value.trim() || "Tujuan";

  try {
    await createRide(
      currentProfile.uid,
      {
        pickupText: "Lokasi saya",
        destinationText: destLabel,
        pickupKm: lastQuote.pickupKm,
        tripKm: lastQuote.tripKm,
        serviceClass: "standard",
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        destLat: dest.lat,
        destLng: dest.lng
      },
      lastQuote
    );

    // Simulasi mencari driver
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      showStep("stepSearch");
      toast("Order dikirim! Menunggu driver menerima.", "success");
      $("destInput").value = "";
      lastQuote = null;
    }, 2500);
  } catch (err) {
    showStep("stepQuote");
    toast(err.message || "Gagal membuat order", "error");
  }
}

// ===== DRIVER =====
function setupDriver() {
  loadDriverDashboard();
  $("toggleOnline").onclick = async () => {
    const btn = $("toggleOnline");
    setLoading(btn, true);
    try {
      const profile = await getDriverProfile(currentProfile.uid);
      const next = !profile?.isOnline;
      await setDriverOnline(currentProfile.uid, next);
      // Simpan lokasi driver jika online
      if (next && getPickup()) {
        const p = getPickup();
        await db.ref("drivers/" + currentProfile.uid).update({
          lastLocation: { lat: p.lat, lng: p.lng, updatedAt: Date.now() }
        });
      }
      toast(next ? "ONLINE" : "OFFLINE", "success");
      loadDriverDashboard();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(btn, false);
    }
  };
  unsubRides = listenRequestedRides(renderDriverOrders);
  unsubActive = listenDriverActiveRides(currentProfile.uid, renderDriverActive);
}

async function loadDriverDashboard() {
  const d = await getDriverProfile(currentProfile.uid);
  const isOnline = d?.isOnline || false;
  $("onlineStatus").textContent = isOnline ? "ONLINE" : "OFFLINE";
  $("onlineStatus").className = "badge " + (isOnline ? "online" : "offline");
  $("toggleOnline").textContent = isOnline ? "Go Offline" : "Go Online";
  $("driverWallet").textContent = formatRupiah(d?.walletBalance || 0);
  $("driverEarnings").textContent = formatRupiah(d?.totalEarnings || 0);
  $("driverRides").textContent = d?.totalRides || 0;
}

function renderDriverOrders(rides) {
  const box = $("driverOrders");
  if (!rides.length) {
    box.innerHTML = '<div class="empty">Tidak ada order.</div>';
    return;
  }
  box.innerHTML = rides
    .map(
      (r) => `<div class="item">
      <div class="row">
        <div><b>${escapeHtml(r.destinationText || r.pickupText)}</b>
        <div class="sub">${r.tripDistanceKm} km · ${formatRupiah(r.fare?.total || 0)}</div></div>
        <button class="primary sm" onclick="handleAcceptRide('${r.id}')">Ambil</button>
      </div>
    </div>`
    )
    .join("");
}

function renderDriverActive(rides) {
  const box = $("driverActive");
  if (!rides.length) {
    box.innerHTML = '<div class="empty">Tidak ada perjalanan aktif.</div>';
    return;
  }
  box.innerHTML = rides
    .map(
      (r) => `<div class="item">
      <div class="row">
        <div><b>${escapeHtml(r.destinationText || r.pickupText)}</b>
        <div class="sub">Hak: ${formatRupiah(r.fare?.driverGross || 0)}</div></div>
        <button class="success sm" style="width:auto;padding:8px 12px" onclick="handleCompleteRide('${r.id}')">Selesai</button>
      </div>
    </div>`
    )
    .join("");
}

window.handleAcceptRide = async function (rideId) {
  try {
    await acceptRide(rideId, currentProfile.uid);
    toast("Order diterima!", "success");
    loadDriverDashboard();
  } catch (err) {
    toast(err.message, "error");
  }
};

window.handleCompleteRide = async function (rideId) {
  if (!confirm("Selesaikan perjalanan? Hak driver masuk saldo.")) return;
  try {
    const result = await completeRide(rideId, currentProfile.uid);
    toast(`+${formatRupiah(result.driverGross)} masuk saldo`, "success");
    loadDriverDashboard();
  } catch (err) {
    toast(err.message, "error");
  }
};

function statusLabel(s) {
  return (
    {
      requested: "Menunggu",
      accepted: "Diterima",
      completed: "Selesai",
      cancelled: "Batal"
    }[s] || s
  );
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ===== INIT =====
async function initApp() {
  if (!initFirebase()) {
    toast("Firebase gagal dimuat", "error");
    return;
  }

  initMap("map");
  bindDestinationSearch($("destInput"), $("suggestList"));

  // Lokasi user + driver icons demo
  try {
    const pos = await locateUser();
    showNearbyDrivers(pos, 6);
  } catch {
    map.setView([-6.2, 106.816666], 13);
    showNearbyDrivers({ lat: -6.2, lng: 106.816666 }, 5);
    toast("Aktifkan lokasi untuk titik jemput akurat");
  }

  setupAuthTabs();
  $("loginForm").onsubmit = handleLogin;
  $("registerForm").onsubmit = handleRegister;
  $("googleBtn").onclick = handleGoogleLogin;
  $("authOpenBtn").onclick = openAuth;
  $("authCloseBtn").onclick = closeAuth;
  $("authModal").addEventListener("click", (e) => {
    if (e.target === $("authModal")) closeAuth();
  });
  $("logoutBtn").onclick = async () => {
    await logoutUser();
    toast("Berhasil keluar");
  };

  $("confirmDestBtn").onclick = onConfirmDest;
  $("checkFareBtn").onclick = onCheckFare;
  $("findDriverBtn").onclick = onFindDriver;
  $("backToSearchBtn").onclick = () => showStep("stepSearch");
  $("backToPinsBtn").onclick = () => showStep("stepPins");
  $("cancelSearchBtn").onclick = () => {
    clearTimeout(searchTimeout);
    showStep("stepQuote");
  };

  onAuthStateChanged(async (user) => {
    if (user) await renderApp();
    else {
      currentProfile = null;
      if (unsubRides) unsubRides();
      if (unsubActive) unsubActive();
      show($("authOpenBtn"), true);
      show($("logoutBtn"), false);
      show($("userChip"), false);
      show($("passengerSheet"), true);
      show($("driverSheet"), false);
      showStep("stepSearch");
    }
  });
}

document.addEventListener("DOMContentLoaded", initApp);
