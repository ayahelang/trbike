/**
 * TRBike — Main App (Map-first + safety prefs + KYC + tips/rating)
 */

let currentProfile = null;
let unsubRides = null;
let unsubActive = null;
let unsubFeedback = null;
let lastQuote = null;
let lastRoute = null;
let searchTimeout = null;
let selectedStars = 0;
let locationWatchId = null;
let activeTrackRideId = null;
let unsubTrack = null;
let feeProofBlob = null;

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
  setTimeout(() => t.classList.remove("show"), 3500);
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? "Memproses..." : btn.dataset.originalText;
}

function showStep(id) {
  ["stepSearch", "stepPins", "stepQuote", "stepSearching"].forEach((s) => show($(s), s === id));
}

function openAuth() { show($("authModal"), true); }
function closeAuth() { show($("authModal"), false); }
function openProfile() {
  if (!currentProfile) { openAuth(); return; }
  renderProfile();
  show($("profileModal"), true);
}
function closeProfile() { show($("profileModal"), false); }

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
    await registerUser(
      name,
      $("regEmail").value.trim(),
      $("regPassword").value,
      $("regRole").value,
      $("regGender")?.value || ""
    );
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

async function renderApp() {
  currentProfile = await getCurrentUserProfile();
  if (!currentProfile) {
    show($("authOpenBtn"), true);
    show($("logoutBtn"), false);
    show($("userChip"), false);
    show($("profileBtn"), false);
    show($("passengerSheet"), true);
    show($("driverSheet"), false);
    showStep("stepSearch");
    updateConfirmBtn();
    show($("stepOrders"), false);
    return;
  }

  show($("authOpenBtn"), false);
  show($("logoutBtn"), true);
  show($("profileBtn"), true);
  show($("userChip"), true);
  $("userChip").textContent =
    (currentProfile.fullName || "").split(" ")[0] +
    (currentProfile.identityVerified ? " ✓" : "");

  // Pref checkboxes
  if ($("prefVerifiedOnly")) {
    $("prefVerifiedOnly").checked = currentProfile.prefs?.verifiedDriversOnly !== false;
  }
  const showGender = currentProfile.identityVerified && currentProfile.gender === "female";
  show($("prefSameGenderWrap"), showGender);
  if ($("prefSameGender")) {
    $("prefSameGender").checked = !!currentProfile.prefs?.sameGenderOnly;
  }

  if (unsubRides) unsubRides();
  if (unsubActive) unsubActive();
  if (unsubFeedback) unsubFeedback();

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

function updateConfirmBtn() {
  const btn = $("confirmDestBtn");
  if (!btn) return;
  const hasDest = !!getDestination();
  btn.disabled = !hasDest;
  btn.classList.toggle("ready", hasDest);
}

function setupPassenger() {
  showStep("stepSearch");
  updateConfirmBtn();
  if (currentProfile) {
    unsubRides = listenPassengerRides(currentProfile.uid, renderPassengerRides);
  }
}

function renderPassengerRides(rides) {
  const box = $("ordersPassenger");
  const wrap = $("stepOrders");
  if (!currentProfile) {
    if (wrap) show(wrap, false);
    if (box) box.innerHTML = "";
    return;
  }
  if (!rides.length) {
    if (wrap) show(wrap, false);
    box.innerHTML = "";
    return;
  }
  show(wrap, true);
  window._rideCache = {};
  rides.slice(0, 8).forEach((r) => (window._rideCache[r.id] = r));
  box.innerHTML = rides
    .slice(0, 8)
    .map(
      (r) => `<button type="button" class="item item-click" data-ride-id="${r.id}">
        <div class="row">
          <b>${escapeHtml(r.destinationText || r.pickupText || "Order")}</b>
          <span class="badge status-${r.status}">${statusLabel(r.status)}</span>
        </div>
        <div class="meta">${r.tripDistanceKm || "—"} km · ${formatRupiah(r.fare?.total || 0)}
          ${r.cancelCharge ? " · charge " + formatRupiah(r.cancelCharge.amount) : ""}
          ${r.rating ? " · ★" + r.rating : ""}
        </div>
      </button>`
    )
    .join("");
  box.querySelectorAll("[data-ride-id]").forEach((el) => {
    el.onclick = () => openOrderDetail(el.dataset.rideId);
  });
  // Auto live track jika ada order accepted
  const live = rides.find((r) => r.status === "accepted" || r.status === "in_trip");
  if (live) startLiveTracking(live.id, "passenger");
  else if (currentProfile?.role === "passenger") stopLiveTracking();
}

function openOrderDetail(rideId) {
  const r = window._rideCache?.[rideId];
  if (!r) return toast("Detail tidak ditemukan", "error");
  window._activeRideId = rideId;
  selectedStars = r.rating || 0;
  paintStars(selectedStars);
  const eta = r.etaMinutes ? `~${r.etaMinutes} mnt` : "—";
  $("orderDetailBody").innerHTML = `
    <div class="detail-grid">
      <div><span class="k">Status</span><span class="badge status-${r.status}">${statusLabel(r.status)}</span></div>
      <div><span class="k">Jemput</span><span>${escapeHtml(r.pickupText || "Lokasi saya")}</span></div>
      <div><span class="k">Tujuan</span><span>${escapeHtml(r.destinationText || "—")}</span></div>
      <div><span class="k">Jarak trip</span><span>${r.tripDistanceKm || 0} km</span></div>
      <div><span class="k">Jarak jemput</span><span>${r.pickupDistanceKm || 0} km</span></div>
      <div><span class="k">ETA</span><span>${eta}</span></div>
      <div><span class="k">Tarif</span><span><strong>${formatRupiah(r.fare?.total || 0)}</strong></span></div>
      <div><span class="k">Hak driver</span><span>${formatRupiah(r.fare?.driverGross || 0)}</span></div>
      ${r.tip ? `<div><span class="k">Tips</span><span>${formatRupiah(r.tip)}</span></div>` : ""}
    </div>`;

  const chargeBox = $("cancelChargeBox");
  if (r.cancelCharge) {
    show(chargeBox, true);
    chargeBox.innerHTML = `<strong>Biaya pembatalan</strong><br>${escapeHtml(r.cancelCharge.reason)}<br>
      Jarak: ${r.cancelCharge.traveledKm} km × 2 × BBM → <strong>${formatRupiah(r.cancelCharge.amount)}</strong>
      <p class="hint-text">Kompensasi ini masuk ke hak driver.</p>`;
  } else if (r.status === "accepted" || r.status === "in_trip") {
    show(chargeBox, true);
    const est = Math.ceil(((r.pickupDistanceKm || 0) * (12500 / 40) * 2) / 500) * 500;
    chargeBox.innerHTML = `<strong>Info pembatalan</strong><br>Jika dibatalkan sekarang (driver sudah ambil order),
      estimasi charge BBM 2× jarak jemput: <strong>${formatRupiah(est)}</strong>`;
  } else {
    show(chargeBox, false);
  }

  $("orderNoteInput").value = r.note || "";
  $("tipAmount").value = r.tip || "";
  show($("orderDetailModal"), true);
}

function closeOrderDetail() {
  show($("orderDetailModal"), false);
  window._activeRideId = null;
}

function paintStars(n) {
  $$("#ratingStars button").forEach((b) => {
    b.classList.toggle("on", +b.dataset.star <= n);
  });
}

async function onConfirmDest() {
  if (!getDestination()) return toast("Pilih tujuan dulu", "error");
  if (!getPickup()) {
    try {
      await locateUser();
    } catch {
      return toast("Izinkan lokasi untuk titik jemput", "error");
    }
  }
  showStep("stepPins");
}

async function onCheckFare() {
  const pickup = getPickup();
  const dest = getDestination();
  if (!pickup || !dest) return toast("Titik jemput & tujuan wajib", "error");
  if (!currentProfile) {
    openAuth();
    return toast("Masuk dulu untuk cek tarif");
  }
  const btn = $("checkFareBtn");
  setLoading(btn, true);
  try {
    lastRoute = await getRouteInfo(pickup, dest);
    const tripKm = Math.max(0.5, +(lastRoute.km || 0).toFixed(1));
    const pickupKm = +(0.5 + Math.random() * 1.5).toFixed(1);
    const rules = await getFareRules();
    lastQuote = calculateFare(tripKm, pickupKm, "standard", rules);
    $("quoteCard").innerHTML = `
      <div class="price">${formatRupiah(lastQuote.total)}</div>
      <div class="meta">~${lastRoute.minutes} mnt · ${tripKm} km · jemput ~${pickupKm} km</div>
      <div class="row"><span>BBM perjalanan</span><span>${formatRupiah(lastQuote.tripFuel)}</span></div>
      <div class="row"><span>BBM penjemputan</span><span>${formatRupiah(lastQuote.pickupFuel)}</span></div>
      <div class="row"><span>Hak driver</span><span>${formatRupiah(lastQuote.driverPool)}</span></div>
      <div class="row total"><span>Total</span><span>${formatRupiah(lastQuote.total)}</span></div>`;
    showStep("stepQuote");
  } catch (err) {
    toast(err.message || "Gagal hitung tarif", "error");
  } finally {
    setLoading(btn, false);
  }
}

async function onFindDriver() {
  if (!currentProfile) return openAuth();
  if (!lastQuote || !getDestination() || !getPickup()) return toast("Hitung tarif dulu", "error");
  showStep("stepSearching");
  const dest = getDestination();
  const pickup = getPickup();
  const destLabel = $("destInput").value.trim() || "Tujuan";
  const prefs = {
    verifiedOnly: $("prefVerifiedOnly")?.checked !== false,
    sameGenderOnly: !!($("prefSameGender")?.checked)
  };
  // Simpan pref ke profil
  try {
    await updateUserProfile(currentProfile.uid, {
      prefs: {
        verifiedDriversOnly: prefs.verifiedOnly,
        sameGenderOnly: prefs.sameGenderOnly
      }
    });
  } catch (_) {}

  // Cash wajib bukti bayar biaya layanan
  const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || "cash";
  let paymentProofUrl = null;
  if (payMethod === "cash") {
    if (!feeProofBlob) {
      showStep("stepQuote");
      return toast("Upload bukti TF/QRIS biaya layanan dulu untuk opsi Cash", "error");
    }
    try {
      paymentProofUrl = await uploadCompressed(currentProfile.uid, feeProofBlob, "fee_proof");
    } catch (e) {
      showStep("stepQuote");
      return toast("Gagal upload bukti. Aktifkan Storage atau coba lagi.", "error");
    }
  }

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
        destLng: dest.lng,
        etaMinutes: lastRoute?.minutes || null,
        prefs,
        paymentMethod: payMethod,
        serviceFeePaid: !!paymentProofUrl,
        paymentProofUrl
      },
      lastQuote
    );
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      showStep("stepSearch");
      toast("Order dikirim! Menunggu driver.", "success");
      $("destInput").value = "";
      lastQuote = null;
    }, 2200);
  } catch (err) {
    showStep("stepQuote");
    toast(err.message || "Gagal order", "error");
  }
}

function setupDriver() {
  loadDriverDashboard();
  const dPrefs = async () => {
    const d = await getDriverProfile(currentProfile.uid);
    if ($("driverPrefVerifiedPax")) {
      $("driverPrefVerifiedPax").checked = !!d?.prefs?.verifiedPassengersOnly;
    }
    const woman =
      currentProfile.identityVerified && currentProfile.gender === "female";
    show($("driverPrefWomenWrap"), woman);
    if ($("driverPrefWomenOnly")) {
      $("driverPrefWomenOnly").checked = !!d?.prefs?.womenPassengersOnly;
    }
  };
  dPrefs();

  $("driverPrefVerifiedPax")?.addEventListener("change", async (e) => {
    await updateDriverPrefs(currentProfile.uid, { verifiedPassengersOnly: e.target.checked });
    toast("Preferensi disimpan", "success");
  });
  $("driverPrefWomenOnly")?.addEventListener("change", async (e) => {
    await updateDriverPrefs(currentProfile.uid, { womenPassengersOnly: e.target.checked });
    toast("Preferensi disimpan", "success");
  });

  $("toggleOnline").onclick = async () => {
    const btn = $("toggleOnline");
    setLoading(btn, true);
    try {
      const profile = await getDriverProfile(currentProfile.uid);
      const next = !profile?.isOnline;
      await setDriverOnline(currentProfile.uid, next);
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
  unsubFeedback = listenDriverFeedback(currentProfile.uid, renderDriverFeedback);
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
        <div class="sub">${r.tripDistanceKm} km · ${formatRupiah(r.fare?.total || 0)}
          ${r.prefs?.verifiedOnly ? " · verifikasi" : ""}
        </div></div>
        <button class="primary sm" type="button" onclick="handleAcceptRide('${r.id}')">Ambil</button>
      </div></div>`
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
    .map((r) => {
      const charge = r.cancelCharge
        ? `<div class="sub charge-note">Charge batal: ${formatRupiah(r.cancelCharge.amount)}</div>`
        : "";
      return `<div class="item">
      <div class="row">
        <div><b>${escapeHtml(r.destinationText || r.pickupText)}</b>
        <div class="sub">Hak: ${formatRupiah(r.fare?.driverGross || 0)}</div>${charge}</div>
        <button class="success sm" style="width:auto;padding:8px 12px" type="button" onclick="handleCompleteRide('${r.id}')">Selesai</button>
      </div></div>`;
    })
    .join("");
}

function renderDriverFeedback(items) {
  const box = $("driverFeedback");
  if (!box) return;
  if (!items.length) {
    box.innerHTML = '<div class="empty">Belum ada tips/rating.</div>';
    return;
  }
  box.innerHTML = items
    .map(
      (f) => `<div class="item">
      <div class="meta">${f.stars ? "★".repeat(f.stars) : "—"}
        ${f.tip ? " · Tips " + formatRupiah(f.tip) : ""}
      </div>
      ${f.comment ? `<div class="sub">${escapeHtml(f.comment)}</div>` : ""}
    </div>`
    )
    .join("");
}

window.handleAcceptRide = async function (rideId) {
  try {
    await acceptRide(rideId, currentProfile.uid);
    toast("Order diterima!", "success");
    loadDriverDashboard();
    startLiveTracking(rideId, "driver");
  } catch (err) {
    toast(err.message, "error");
  }
};

window.handleCompleteRide = async function (rideId) {
  if (!confirm("Selesaikan perjalanan?")) return;
  try {
    const result = await completeRide(rideId, currentProfile.uid);
    stopLiveTracking();
    toast(`+${formatRupiah(result.driverGross)} saldo`, "success");
    loadDriverDashboard();
  } catch (err) {
    toast(err.message, "error");
  }
};

function renderProfile() {
  const p = currentProfile;
  const st = p.verificationStatus || "none";
  $("profileBody").innerHTML = `
    <div class="detail-grid">
      <div><span class="k">Nama</span>${escapeHtml(p.fullName)}</div>
      <div><span class="k">Role</span>${p.role}</div>
      <div><span class="k">Verifikasi</span>${
        p.identityVerified
          ? '<span class="badge online">Terverifikasi</span>'
          : st === "pending"
          ? '<span class="badge status-requested">Menunggu</span>'
          : '<span class="badge muted">Belum</span>'
      }</div>
    </div>`;
  if ($("profileGender")) $("profileGender").value = p.gender || "";
  $("profileMsg").textContent = "";
}

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


/** Live share lokasi saat order accepted / in_trip */
function stopLiveTracking() {
  if (locationWatchId != null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
  if (unsubTrack) {
    unsubTrack();
    unsubTrack = null;
  }
  activeTrackRideId = null;
  clearPeerMarker();
  show($("trackingBanner"), false);
}

function startLiveTracking(rideId, role) {
  stopLiveTracking();
  activeTrackRideId = rideId;
  show($("trackingBanner"), true);

  // Publish my location
  if (navigator.geolocation) {
    locationWatchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const path =
          role === "driver"
            ? "rides/" + rideId + "/driverLoc"
            : "rides/" + rideId + "/passengerLoc";
        try {
          await db.ref(path).set({ lat, lng, updatedAt: Date.now() });
        } catch (_) {}
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  }

  // Listen peer
  const peerPath =
    role === "driver" ? "rides/" + rideId + "/passengerLoc" : "rides/" + rideId + "/driverLoc";
  const ref = db.ref(peerPath);
  const handler = (snap) => {
    const v = snap.val();
    if (!v || v.lat == null) return;
    setPeerLocation({ lat: v.lat, lng: v.lng }, role === "driver" ? "Penumpang" : "Driver");
    const me = getPickup();
    if (me) fitPickupAndPeer(me, { lat: v.lat, lng: v.lng });
  };
  ref.on("value", handler);
  unsubTrack = () => ref.off("value", handler);
}

async function initApp() {
  if (!initFirebase()) {
    toast("Firebase gagal dimuat", "error");
    return;
  }

  initMap("map");
  // QRIS static image optional
  const qimg = $("qrisImg");
  if (qimg) {
    qimg.onload = () => { qimg.classList.remove("hidden"); };
    qimg.onerror = () => {};
    qimg.src = "assets/qris.png";
  }
  bindDestinationSearch($("destInput"), $("suggestList"));
  window.onMapPinsChanged = () => updateConfirmBtn();
  updateConfirmBtn();

  try {
    const pos = await locateUser();
    showNearbyDrivers(pos, 6);
  } catch {
    map.setView([-6.2, 106.816666], 13);
    showNearbyDrivers({ lat: -6.2, lng: 106.816666 }, 5);
  }

  setupAuthTabs();
  $("loginForm").onsubmit = handleLogin;
  $("registerForm").onsubmit = handleRegister;
  $("googleBtn").onclick = handleGoogleLogin;
  $("authOpenBtn").onclick = openAuth;
  $("authCloseBtn").onclick = closeAuth;
  $("profileBtn").onclick = openProfile;
  $("profileClose").onclick = closeProfile;
  $("authModal").addEventListener("click", (e) => {
    if (e.target === $("authModal")) closeAuth();
  });
  $("profileModal").addEventListener("click", (e) => {
    if (e.target === $("profileModal")) closeProfile();
  });

  $("logoutBtn").onclick = async () => {
    if (unsubRides) { unsubRides(); unsubRides = null; }
    if (unsubActive) { unsubActive(); unsubActive = null; }
    if (unsubFeedback) { unsubFeedback(); unsubFeedback = null; }
    await logoutUser();
    if ($("ordersPassenger")) $("ordersPassenger").innerHTML = "";
    show($("stepOrders"), false);
    closeOrderDetail();
    toast("Berhasil keluar");
  };

  const confBtn = $("confirmDestBtn");
  confBtn.onclick = onConfirmDest;
  $("checkFareBtn").onclick = onCheckFare;
  $("findDriverBtn").onclick = onFindDriver;
  $("backToSearchBtn").onclick = () => showStep("stepSearch");
  $("backToPinsBtn").onclick = () => showStep("stepPins");
  $("cancelSearchBtn").onclick = () => {
    clearTimeout(searchTimeout);
    showStep("stepQuote");
  };

  // Stars
  $$("#ratingStars button").forEach((b) => {
    b.onclick = () => {
      selectedStars = +b.dataset.star;
      paintStars(selectedStars);
    };
  });

  $("orderDetailClose").onclick = closeOrderDetail;
  $("orderDetailModal").addEventListener("click", (e) => {
    if (e.target === $("orderDetailModal")) closeOrderDetail();
  });

  $("orderCancelBtn").onclick = async () => {
    if (!window._activeRideId || !currentProfile) return;
    const r = window._rideCache?.[window._activeRideId];
    let msg = "Batalkan pesanan ini?";
    if (r && (r.status === "accepted" || r.status === "in_trip")) {
      msg =
        "Driver sudah mengambil order. Anda akan dikenai kompensasi BBM 2× jarak jemput. Lanjutkan?";
    }
    if (!confirm(msg)) return;
    try {
      const res = await cancelRide(window._activeRideId, currentProfile.uid);
      closeOrderDetail();
      if (res.cancelCharge) {
        toast(
          `Dibatalkan. Charge ${formatRupiah(res.cancelCharge.amount)} ke driver`,
          "success"
        );
      } else {
        toast("Pesanan dibatalkan", "success");
      }
    } catch (err) {
      toast(err.message, "error");
    }
  };

  $("orderReorderBtn").onclick = async () => {
    if (!window._activeRideId || !currentProfile) return;
    try {
      await reorderRide(window._activeRideId, currentProfile.uid);
      closeOrderDetail();
      showStep("stepSearching");
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        showStep("stepSearch");
        toast("Order dikirim ulang", "success");
      }, 2000);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  $("orderSaveNoteBtn").onclick = async () => {
    if (!window._activeRideId || !currentProfile) return;
    try {
      const note = $("orderNoteInput").value.trim();
      await updateRide(window._activeRideId, currentProfile.uid, { note });
      if (window._rideCache?.[window._activeRideId]) {
        window._rideCache[window._activeRideId].note = note;
      }
      toast("Catatan disimpan", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  $("orderDeleteBtn").onclick = async () => {
    if (!window._activeRideId || !currentProfile) return;
    if (!confirm("Hapus pesanan permanen?")) return;
    try {
      await deleteRide(window._activeRideId, currentProfile.uid);
      closeOrderDetail();
      toast("Pesanan dihapus", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  $("orderEditPinsBtn").onclick = () => {
    const r = window._rideCache?.[window._activeRideId];
    if (!r) return;
    closeOrderDetail();
    if (r.pickupLat && r.pickupLng) setPickup({ lat: r.pickupLat, lng: r.pickupLng }, true);
    if (r.destLat && r.destLng) setDestination({ lat: r.destLat, lng: r.destLng }, true);
    if (r.destinationText) $("destInput").value = r.destinationText;
    showStep("stepPins");
    toast("Geser pin, lalu Cek Tarif");
  };

  $("orderRateTipBtn").onclick = async () => {
    if (!window._activeRideId || !currentProfile) return;
    try {
      const tip = $("tipAmount").value;
      await submitTipAndRating(window._activeRideId, currentProfile.uid, {
        stars: selectedStars || null,
        tip,
        comment: $("orderNoteInput").value.trim()
      });
      toast("Rating & tips terkirim ke driver", "success");
      closeOrderDetail();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  $("saveProfileBtn").onclick = async () => {
    try {
      await updateUserProfile(currentProfile.uid, {
        gender: $("profileGender").value || ""
      });
      currentProfile = await getCurrentUserProfile();
      toast("Profil disimpan", "success");
      renderProfile();
    } catch (err) {
      $("profileMsg").textContent = err.message;
    }
  };

  $("submitKycBtn").onclick = async () => {
    const btn = $("submitKycBtn");
    setLoading(btn, true);
    $("profileMsg").textContent = "";
    try {
      const selfie = $("kycSelfie").files?.[0];
      const ktp = $("kycKtp").files?.[0];
      if (!selfie || !ktp) throw new Error("Upload selfie + foto KTP");
      // Kompres dulu biar ringan
      const selfieBlob = await compressImage(selfie, { maxSide: 1024, maxBytes: 300 * 1024 });
      const ktpBlob = await compressImage(ktp, { maxSide: 1024, maxBytes: 300 * 1024 });
      let selfieUrl, ktpUrl;
      try {
        selfieUrl = await uploadCompressed(currentProfile.uid, selfieBlob, "selfie");
        ktpUrl = await uploadCompressed(currentProfile.uid, ktpBlob, "ktp");
      } catch (upErr) {
        console.warn(upErr);
        throw new Error("Upload gagal. Aktifkan Firebase Storage (lihat docs).");
      }
      await submitKyc(currentProfile.uid, { selfieUrl, ktpUrl });
      currentProfile = await getCurrentUserProfile();
      toast("Verifikasi OK · foto sudah dikompres", "success");
      renderProfile();
      await renderApp();
    } catch (err) {
      $("profileMsg").textContent = err.message;
    } finally {
      setLoading(btn, false);
    }
  };

  // Bukti bayar fee
  $("feeProofFile")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    feeProofBlob = null;
    if (!f) return;
    try {
      feeProofBlob = await compressImage(f, { maxSide: 1280, maxBytes: 280 * 1024 });
      $("feeProofStatus").textContent =
        "Bukti siap (" + Math.round(feeProofBlob.size / 1024) + " KB setelah kompres)";
    } catch (err) {
      $("feeProofStatus").textContent = err.message;
    }
  });

  // Persist pref changes
  $("prefVerifiedOnly")?.addEventListener("change", async (e) => {
    if (!currentProfile) return;
    await updateUserProfile(currentProfile.uid, {
      prefs: {
        ...(currentProfile.prefs || {}),
        verifiedDriversOnly: e.target.checked
      }
    });
  });
  $("prefSameGender")?.addEventListener("change", async (e) => {
    if (!currentProfile) return;
    await updateUserProfile(currentProfile.uid, {
      prefs: {
        ...(currentProfile.prefs || {}),
        sameGenderOnly: e.target.checked
      }
    });
  });

  onAuthStateChanged(async (user) => {
    if (user) await renderApp();
    else {
      currentProfile = null;
      if (unsubRides) { unsubRides(); unsubRides = null; }
      if (unsubActive) { unsubActive(); unsubActive = null; }
      if (unsubFeedback) { unsubFeedback(); unsubFeedback = null; }
      show($("authOpenBtn"), true);
      show($("logoutBtn"), false);
      show($("userChip"), false);
      show($("profileBtn"), false);
      show($("passengerSheet"), true);
      show($("driverSheet"), false);
      showStep("stepSearch");
      if ($("ordersPassenger")) $("ordersPassenger").innerHTML = "";
      show($("stepOrders"), false);
      closeOrderDetail();
    }
  });
}

document.addEventListener("DOMContentLoaded", initApp);
