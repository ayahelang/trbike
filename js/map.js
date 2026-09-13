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
      draggable: true
    }).addTo(map);
    destMarker.on("dragend", () => {
      destLatLng = destMarker.getLatLng();
      onPinsChanged();
    });
  } else {
    destMarker.setLatLng(destLatLng);
  }
  if (fly && pickupLatLng) {
    map.fitBounds(L.latLngBounds([pickupLatLng, destLatLng]).pad(0.25));
  } else if (fly) {
    map.flyTo(destLatLng, 15, { duration: 0.8 });
  }
  onPinsChanged();
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
          btn.onclick = () => {
            const item = results[+btn.dataset.i];
            if (!item) return;
            inputEl.value = item.label;
            listEl.classList.add("hidden");
            setDestination({ lat: item.lat, lng: item.lng }, true);
          };
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
}

function clearRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
}

/** Demo driver icons around user (MVP visual) */
function showNearbyDrivers(center, count = 5) {
  clearDriverMarkers();
  if (!center) return;
  for (let i = 0; i < count; i++) {
    const offset = 0.004 + Math.random() * 0.012;
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const lat = center.lat + offset * Math.cos(angle);
    const lng = center.lng + offset * Math.sin(angle);
    const m = L.marker([lat, lng], { icon: DRIVER_ICON }).addTo(map);
    driverMarkers.push(m);
  }
}

function clearDriverMarkers() {
  driverMarkers.forEach((m) => map.removeLayer(m));
  driverMarkers = [];
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
