/**
 * TRBike — Main Application Controller
 */

let currentProfile = null;
let unsubRides = null;
let unsubActive = null;

// ========== UTIL ==========
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function show(el, visible = true) {
  if (!el) return;
  el.classList.toggle("hidden", !visible);
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

// ========== AUTH UI ==========
function setupAuthTabs() {
  $$(".tab").forEach(tab => {
    tab.onclick = () => {
      $$(".tab").forEach(t => t.classList.remove("active"));
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
    const email = $("regEmail").value.trim();
    const pass = $("regPassword").value;
    const role = $("regRole").value;

    if (name.length < 2) throw new Error("Nama terlalu pendek");
    await registerUser(name, email, pass, role);
    toast("Akun berhasil dibuat", "success");
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
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Email atau password salah.";
  }
  return err.message || "Terjadi kesalahan.";
}

// ========== RENDER ==========
async function renderApp() {
  currentProfile = await getCurrentUserProfile();

  if (!currentProfile) {
    show($("authView"), true);
    show($("appView"), false);
    show($("logoutBtn"), false);
    return;
  }

  show($("authView"), false);
  show($("appView"), true);
  show($("logoutBtn"), true);

  $("userName").textContent = currentProfile.fullName;
  $("roleBadge").textContent = currentProfile.role === "driver" ? "DRIVER" : "PENUMPANG";
  $("roleBadge").className = "badge " + (currentProfile.role === "driver" ? "driver" : "passenger");

  $("verificationBadge").innerHTML = currentProfile.identityVerified
    ? `<span class="badge verified">Terverifikasi</span>`
    : `<span class="badge muted">Belum verifikasi</span>`;

  const isPassenger = currentProfile.role === "passenger";
  show($("passengerView"), isPassenger);
  show($("driverView"), !isPassenger);

  // Bersihkan listener lama
  if (unsubRides) unsubRides();
  if (unsubActive) unsubActive();

  if (isPassenger) {
    setupPassenger();
  } else {
    setupDriver();
  }
}

// ========== PASSENGER ==========
let lastQuote = null;

function setupPassenger() {
  $("quoteBtn").onclick = async () => {
    const trip = +$("tripKm").value;
    const pickup = +$("pickupKm").value;
    const cls = $("serviceClass").value;

    if (trip <= 0) {
      toast("Jarak perjalanan harus lebih dari 0", "error");
      return;
    }

    const rules = await getFareRules();
    lastQuote = calculateFare(trip, pickup, cls, rules);

    $("quoteBox").innerHTML = `
      <div class="price">${formatRupiah(lastQuote.total)}</div>
      <div class="quote-meta">
        <span>${lastQuote.tripKm} km trip</span>
        <span>•</span>
        <span>${lastQuote.pickupKm} km jemput</span>
        <span>•</span>
        <span class="class-tag">${cls}</span>
      </div>
      <div class="breakdown">
        <div class="row"><span>BBM perjalanan</span><span>${formatRupiah(lastQuote.tripFuel)}</span></div>
        <div class="row"><span>BBM penjemputan</span><span>${formatRupiah(lastQuote.pickupFuel)}</span></div>
        <div class="row"><span>Driver pool (hak driver)</span><span>${formatRupiah(lastQuote.driverPool)}</span></div>
        <div class="row"><span>Biaya layanan</span><span>${formatRupiah(lastQuote.serviceFee)}</span></div>
        <div class="row"><span>Pajak</span><span>${formatRupiah(lastQuote.tax)}</span></div>
        <div class="row total"><span>Total</span><span>${formatRupiah(lastQuote.total)}</span></div>
      </div>
      <p class="hint">Driver menerima sekitar <strong>${formatRupiah(lastQuote.driverGross)}</strong> (hak dari pembayaran ini)</p>
    `;
    show($("quoteBox"), true);
    show($("requestBtn"), true);
  };

  $("requestBtn").onclick = async () => {
    if (!lastQuote) return;
    const btn = $("requestBtn");
    setLoading(btn, true);

    try {
      await createRide(currentProfile.uid, {
        pickupText: $("pickupText").value.trim() || "Lokasi penjemputan",
        destinationText: $("destinationText").value.trim() || "",
        pickupKm: $("pickupKm").value,
        tripKm: $("tripKm").value,
        serviceClass: $("serviceClass").value
      }, lastQuote);

      toast("Order berhasil dibuat!", "success");
      show($("requestBtn"), false);
      lastQuote = null;
    } catch (err) {
      toast(err.message || "Gagal membuat order", "error");
    } finally {
      setLoading(btn, false);
    }
  };

  unsubRides = listenPassengerRides(currentProfile.uid, renderPassengerRides);
}

function renderPassengerRides(rides) {
  const box = $("ordersPassenger");
  if (!rides.length) {
    box.innerHTML = `<div class="empty">Belum ada pesanan.</div>`;
    return;
  }

  box.innerHTML = rides.map(r => {
    const canCancel = r.status === "requested";
    return `
      <div class="item">
        <div class="row">
          <div>
            <b>${escapeHtml(r.pickupText || "Lokasi")}</b>
            ${r.destinationText ? `<div class="sub">${escapeHtml(r.destinationText)}</div>` : ""}
          </div>
          <span class="badge status-${r.status}">${statusLabel(r.status)}</span>
        </div>
        <div class="meta">
          ${r.tripDistanceKm} km · ${formatRupiah(r.fare?.total || 0)}
          ${r.driverId ? " · Driver sudah menerima" : ""}
        </div>
        ${canCancel ? `
          <div style="margin-top:10px">
            <button class="btn ghost-dark sm" onclick="handleCancelRide('${r.id}')">Batalkan</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

window.handleCancelRide = async function (rideId) {
  if (!confirm("Yakin ingin membatalkan order ini?")) return;
  try {
    await cancelRide(rideId, currentProfile.uid);
    toast("Order dibatalkan", "success");
  } catch (err) {
    toast(err.message || "Gagal membatalkan", "error");
  }
};

// ========== DRIVER ==========
function setupDriver() {
  loadDriverDashboard();

  $("toggleOnline").onclick = async () => {
    const btn = $("toggleOnline");
    setLoading(btn, true);
    try {
      const profile = await getDriverProfile(currentProfile.uid);
      const next = !(profile?.isOnline);
      await setDriverOnline(currentProfile.uid, next);
      toast(next ? "Anda sekarang ONLINE" : "Anda OFFLINE", "success");
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
    box.innerHTML = `<div class="empty">Tidak ada order masuk saat ini.</div>`;
    return;
  }

  box.innerHTML = rides.map(r => `
    <div class="item">
      <div class="row">
        <div>
          <b>${escapeHtml(r.pickupText || "Lokasi")}</b>
          <div class="sub">Jemput ${r.pickupDistanceKm} km · Trip ${r.tripDistanceKm} km</div>
        </div>
        <button class="btn primary sm" onclick="handleAcceptRide('${r.id}')">Ambil</button>
      </div>
      <div class="meta">${formatRupiah(r.fare?.total || 0)} · Estimasi hak driver ${formatRupiah(r.fare?.driverGross || 0)}</div>
    </div>
  `).join("");
}

function renderDriverActive(rides) {
  const box = $("driverActive");
  if (!box) return;

  if (!rides.length) {
    box.innerHTML = `<div class="empty">Belum ada perjalanan aktif.</div>`;
    return;
  }

  box.innerHTML = rides.map(r => `
    <div class="item">
      <div class="row">
        <div>
          <b>${escapeHtml(r.pickupText || "Lokasi")}</b>
          <div class="sub">${r.tripDistanceKm} km · ${formatRupiah(r.fare?.total || 0)}</div>
        </div>
        <button class="btn success sm" onclick="handleCompleteRide('${r.id}')">Selesaikan</button>
      </div>
      <div class="meta">Hak driver: ${formatRupiah(r.fare?.driverGross || 0)}</div>
    </div>
  `).join("");
}

window.handleAcceptRide = async function (rideId) {
  try {
    await acceptRide(rideId, currentProfile.uid);
    toast("Order berhasil diterima!", "success");
    loadDriverDashboard();
  } catch (err) {
    toast(err.message || "Gagal mengambil order", "error");
  }
};

window.handleCompleteRide = async function (rideId) {
  if (!confirm("Selesaikan perjalanan ini? Hak driver akan ditambahkan ke saldo.")) return;
  try {
    const result = await completeRide(rideId, currentProfile.uid);
    toast(`Selesai! +${formatRupiah(result.driverGross)} masuk ke saldo`, "success");
    loadDriverDashboard();
  } catch (err) {
    toast(err.message || "Gagal menyelesaikan order", "error");
  }
};

function statusLabel(s) {
  const map = {
    requested: "Menunggu",
    accepted: "Diterima",
    driver_arriving: "Menuju",
    in_trip: "Perjalanan",
    completed: "Selesai",
    cancelled: "Dibatalkan"
  };
  return map[s] || s;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ========== INIT ==========
function initApp() {
  if (!initFirebase()) {
    $("authMsg").textContent = "Firebase belum dikonfigurasi. Edit js/config.js";
    show($("authView"), true);
    return;
  }

  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    $("authMsg").innerHTML = `Firebase belum dikonfigurasi.<br>Buka <code>js/config.js</code> dan isi dengan config project Anda.`;
    show($("authView"), true);
    return;
  }

  setupAuthTabs();
  $("loginForm").onsubmit = handleLogin;
  $("registerForm").onsubmit = handleRegister;
  $("logoutBtn").onclick = async () => {
    await logoutUser();
    toast("Berhasil keluar");
  };

  onAuthStateChanged(async (user) => {
    if (user) {
      await renderApp();
    } else {
      currentProfile = null;
      if (unsubRides) unsubRides();
      if (unsubActive) unsubActive();
      show($("authView"), true);
      show($("appView"), false);
      show($("logoutBtn"), false);
    }
  });
}

document.addEventListener("DOMContentLoaded", initApp);
