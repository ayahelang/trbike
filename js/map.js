/**
 * TRBike — Map Module (Leaflet + OSM + Nominatim + OSRM)
 */

let map = null;
let pickupMarker = null;
let destMarker = null;
let driverMarkers = [];
let routeLine = null;
let pickupLatLng = null;
let destLatLng = null;
let searchTimer = null;

const DEFAULT_CENTER = [-6.200000, 106.816666]; // Jakarta
const DRIVER_ICON = L.divIcon({
  className: "driver-marker",
  html: '<div class="bike-pin">🛵</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});
const PICKUP_ICON = L.divIcon({
  className: "pin-marker pickup",
  html: '<div class="pin-dot pickup"></div><span>Jemput</span>',
  iconSize: [70, 40],
  iconAnchor: [12, 36]
});
const DEST_ICON = L.divIcon({
  className: "pin-marker dest",
  html: '<div class="pin-dot dest"></div><span>Tujuan</span>',
  iconSize: [70, 40],
  iconAnchor: [12, 36]
});

function initMap(containerId = "map") {
  if (map) return map;

  map = L.map(containerId, {
    zoomControl: false,
    attributionControl: true
  }).setView(DEFAULT_CENTER, 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
  return map;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Geolocation → set pickup */
function locateUser() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setPickup(latlng, true);
        resolve(latlng);
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  });
}

function setPickup(latlng, fly = false) {
  pickupLatLng = L.latLng(latlng.lat, latlng.lng);
  if (!pickupMarker) {
    pickupMarker = L.marker(pickupLatLng, {
      icon: PICKUP_ICON,
      draggable: true
    }).addTo(map);
    pickupMarker.on("dragend", () => {
      pickupLatLng = pickupMarker.getLatLng();
      onPinsChanged();
    });
  } else {
    pickupMarker.setLatLng(pickupLatLng);
  }
  if (fly) map.flyTo(pickupLatLng, 15, { duration: 0.8 });
  onPinsChanged();
}

function setDestination(latlng, fly = false) {
  destLatLng = L.latLng(latlng.lat, latlng.lng);
  if (!destMarker) {
    destMarker = L.marker(destLatLng, {
      icon: DEST_ICON,
      draggable: true,
      autoPan: true
    }).addTo(map);
    destMarker.on("dragend", () => {
      destLatLng = destMarker.getLatLng();
      onPinsChanged();
    });
    // Touch: juga update saat drag
    destMarker.on("drag", () => {
      destLatLng = destMarker.getLatLng();
    });
  } else {
    destMarker.setLatLng(destLatLng);
  }
  if (fly && pickupLatLng) {
    map.fitBounds(L.latLngBounds([pickupLatLng, destLatLng]), {
      paddingTopLeft: [40, 80],
      paddingBottomRight: [40, Math.min(window.innerHeight * 0.42, 320)],
      maxZoom: 16
    });
  } else if (fly) {
    map.flyTo(destLatLng, 15, { duration: 0.8 });
  }
  onPinsChanged();
  // Pastikan tombol konfirmasi aktif
  const btn = document.getElementById("confirmDestBtn");
  if (btn) {
    btn.disabled = false;
    btn.classList.add("ready");
  }
}

function onPinsChanged() {
  if (typeof window.onMapPinsChanged === "function") {
    window.onMapPinsChanged({
      pickup: pickupLatLng,
      dest: destLatLng
    });
  }
}

/** Nominatim autocomplete */
async function searchPlaces(query) {
  if (!query || query.trim().length < 3) return [];
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: 1,
      limit: 6,
      countrycodes: "id"
    });
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item) => ({
    label: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon)
  }));
}

function bindDestinationSearch(inputEl, listEl) {
  inputEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = inputEl.value.trim();
    if (q.length < 3) {
      listEl.innerHTML = "";
      listEl.classList.add("hidden");
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const results = await searchPlaces(q);
        if (!results.length) {
          listEl.innerHTML = '<div class="suggest-item muted">Tidak ditemukan</div>';
          listEl.classList.remove("hidden");
          return;
        }
        listEl.innerHTML = results
          .map(
            (r, i) =>
              `<button type="button" class="suggest-item" data-i="${i}">${escapeHtml(r.label)}</button>`
          )
          .join("");
        listEl.classList.remove("hidden");
        listEl.querySelectorAll(".suggest-item").forEach((btn) => {
          const pick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const item = results[+btn.dataset.i];
            if (!item) return;
            inputEl.value = item.label;
            listEl.classList.add("hidden");
            setDestination({ lat: item.lat, lng: item.lng }, true);
          };
          btn.onclick = pick;
          btn.ontouchend = pick;
        });
      } catch (e) {
        console.warn("Nominatim error", e);
      }
    }, 400);
  });
}

/** Driving distance via OSRM (fallback haversine × 1.3) */
async function getRouteInfo(from, to) {
  if (!from || !to) return null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const km = route.distance / 1000;
        const minutes = Math.ceil(route.duration / 60);
        drawRoute(route.geometry);
        return { km, minutes, source: "osrm" };
      }
    }
  } catch (e) {
    console.warn("OSRM fallback", e);
  }
  const straight = haversineKm(from, to);
  const km = straight * 1.35;
  clearRoute();
  return {
    km,
    minutes: Math.ceil((km / 25) * 60),
    source: "estimate"
  };
}

function drawRoute(geojson) {
  clearRoute();
  routeLine = L.geoJSON(geojson, {
    style: { color: "#0f1115", weight: 4, opacity: 0.75 }
  }).addTo(map);
  // Zoom agar seluruh rute muat di layar (sisa ruang untuk sheet bawah)
  try {
    const b = routeLine.getBounds();
    if (b.isValid()) {
      map.fitBounds(b, {
        paddingTopLeft: [40, 80],
        paddingBottomRight: [40, Math.min(window.innerHeight * 0.42, 320)],
        maxZoom: 16,
        animate: true
      });
    }
  } catch (_) {}
}

/** Fit pickup + dest + route (fallback tanpa geometry) */
function fitTripBounds(from, to) {
  if (!map || !from || !to) return;
  const b = L.latLngBounds([from, to]);
  map.fitBounds(b, {
    paddingTopLeft: [40, 80],
    paddingBottomRight: [40, Math.min(window.innerHeight * 0.42, 320)],
    maxZoom: 16,
    animate: true
  });
}

function clearRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
}

/** Radius km untuk marker terdekat di peta */
const NEARBY_RADIUS_KM = 5;
let presenceMarkers = [];
let presenceUnsub = null;

function haversineKm(a, b) {
  if (!a || !b) return 999;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function driverBikeIcon(verified) {
  const cls = verified ? "bike-pin verified" : "bike-pin unverified";
  const title = verified ? "Driver terverifikasi" : "Driver belum diverifikasi";
  return L.divIcon({
    className: "driver-marker",
    html: `<div class="${cls}" title="${title}">🛵</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

function passengerDotIcon(status) {
  // ghost | app_open | logged_in | ordering | waiting
  const map = {
    ghost: "pax-dot ghost",
    app_open: "pax-dot app-open",
    logged_in: "pax-dot logged-in",
    ordering: "pax-dot ordering",
    waiting: "pax-dot waiting"
  };
  const labels = {
    ghost: "Jejak pelanggan (belum buka app)",
    app_open: "Pelanggan membuka aplikasi",
    logged_in: "Pelanggan login",
    ordering: "Sedang input pesanan",
    waiting: "Menunggu driver"
  };
  const cls = map[status] || map.logged_in;
  const title = labels[status] || labels.logged_in;
  return L.divIcon({
    className: "driver-marker",
    html: `<div class="${cls}" title="${title}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

/** Legacy demo — diganti showPresenceMarkers */
function showNearbyDrivers(center, count = 5) {
  // no-op: presence real-time menggantikan demo
  if (center && map) map.setView([center.lat, center.lng], map.getZoom() || 14);
}

function clearDriverMarkers() {
  presenceMarkers.forEach((m) => {
    try { map.removeLayer(m); } catch (_) {}
  });
  presenceMarkers = [];
  driverMarkers.forEach((m) => {
    try { map.removeLayer(m); } catch (_) {}
  });
  driverMarkers = [];
}

function clearPresenceMarkers() {
  clearDriverMarkers();
}

function stopPresenceListener() {
  if (presenceUnsub) {
    try { presenceUnsub(); } catch (_) {}
    presenceUnsub = null;
  }
  clearPresenceMarkers();
}

/**
 * Dengarkan presence terdekat.
 * viewerRole: "driver" → lihat penumpang; "passenger" → lihat driver
 */
function startPresenceListener(myUid, viewerRole, centerGetter) {
  stopPresenceListener();
  if (typeof db === "undefined" || !db) return;

  const ref = db.ref("presence");
  const handler = (snap) => {
    const center = typeof centerGetter === "function" ? centerGetter() : null;
    const base = center || (map ? map.getCenter() : null);
    if (!base) return;
    clearPresenceMarkers();
    const now = Date.now();
    snap.forEach((child) => {
      const uid = child.key;
      if (uid === myUid) return;
      const v = child.val() || {};
      if (v.lat == null || v.lng == null) return;
      const age = now - (v.lastSeen || 0);
      // stale > 30 menit abaikan (kecuali ghost dalam toleransi)
      if (age > 30 * 60 * 1000 && v.status !== "ghost") return;
      if (v.status === "ghost" && age > 24 * 60 * 60 * 1000) return;

      const dist = haversineKm(
        { lat: base.lat, lng: base.lng },
        { lat: Number(v.lat), lng: Number(v.lng) }
      );
      if (dist > NEARBY_RADIUS_KM) return;

      if (viewerRole === "driver") {
        // Driver melihat pelanggan
        if (v.role === "driver") return;
        const st = v.status || "logged_in";
        const m = L.marker([v.lat, v.lng], {
          icon: passengerDotIcon(st),
          interactive: true
        }).addTo(map);
        m.bindPopup(
          `<strong>Pelanggan</strong><br>${labelsStatus(st)}<br>~${dist.toFixed(1)} km`
        );
        presenceMarkers.push(m);
      } else {
        // Penumpang melihat driver online
        if (v.role !== "driver") return;
        if (v.status === "ghost" || v.status === "offline") return;
        // hanya yang online / logged
        if (v.isOnline === false) return;
        const verified = !!v.identityVerified;
        const m = L.marker([v.lat, v.lng], {
          icon: driverBikeIcon(verified),
          interactive: true
        }).addTo(map);
        m.bindPopup(
          `<strong>Driver ${verified ? "✓" : ""}</strong><br>${
            verified ? "Terverifikasi" : "Belum diverifikasi"
          }<br>~${dist.toFixed(1)} km`
        );
        presenceMarkers.push(m);
      }
    });
  };

  ref.on("value", handler);
  presenceUnsub = () => ref.off("value", handler);
}

function labelsStatus(st) {
  return (
    {
      ghost: "Jejak (belum buka app)",
      app_open: "Membuka aplikasi",
      logged_in: "Login di aplikasi",
      ordering: "Input data pesanan",
      waiting: "Menunggu driver"
    }[st] || st
  );
}

function getPickup() {
  return pickupLatLng;
}
function getDestination() {
  return destLatLng;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


/** Marker pasangan (driver/passenger) untuk tracking */
let peerMarker = null;
const PEER_ICON = L.divIcon({
  className: "driver-marker",
  html: '<div class="bike-pin peer">📍</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

function setPeerLocation(latlng, label) {
  if (!map || !latlng) return;
  const ll = L.latLng(latlng.lat, latlng.lng);
  if (!peerMarker) {
    peerMarker = L.marker(ll, { icon: PEER_ICON }).addTo(map);
  } else {
    peerMarker.setLatLng(ll);
  }
  if (label) peerMarker.bindPopup(label);
}

function clearPeerMarker() {
  if (peerMarker && map) {
    map.removeLayer(peerMarker);
    peerMarker = null;
  }
}

function fitPickupAndPeer(a, b) {
  if (!map || !a || !b) return;
  map.fitBounds(L.latLngBounds([a, b]).pad(0.3));
}
