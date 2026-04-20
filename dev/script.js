const SUPABASE_URL = "https://njraifhxvyvfsgergqav.supabase.co";
const SUPABASE_KEY = "sb_publishable_PBk-fCMKHLk0hVFqJ0XdGg_dwOgYET0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userLat = -6.2;
let userLng = 106.8;

let map;
let userMarker;
let destinationMarker;
let routeLine;

let driverMarkers = [];
let selectedDistance = 0;

// INIT
window.onload = () => {
    initMap();
    getUserLocation();
    loadDrivers();
};

// MAP
function initMap() {
    map = L.map('map').setView([userLat, userLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    // klik tujuan
    map.on('click', function(e) {
        setDestination(e.latlng.lat, e.latlng.lng);
    });
}

// GPS
function getUserLocation() {

    navigator.geolocation.getCurrentPosition(

        pos => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;

            map.setView([userLat, userLng], 15);

            setUserMarker();
        },

        err => {
            setUserMarker();
        },

        {
            enableHighAccuracy: true
        }
    );
}

// USER MARKER
function setUserMarker() {

    if (userMarker) map.removeLayer(userMarker);

    userMarker = L.marker([userLat, userLng])
        .addTo(map)
        .bindPopup("📍 Kamu")
        .openPopup();
}

// DESTINATION
function setDestination(lat, lng) {

    if (destinationMarker) map.removeLayer(destinationMarker);
    if (routeLine) map.removeLayer(routeLine);

    destinationMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("🎯 Tujuan")
        .openPopup();

    routeLine = L.polyline([
        [userLat, userLng],
        [lat, lng]
    ]).addTo(map);

    selectedDistance = getDistance(userLat, userLng, lat, lng);

    let price = calculateTripPrice(selectedDistance);

    document.getElementById("statusText").innerText =
        "Tujuan dipilih 🎯";

    document.getElementById("infoText").innerText =
        `Jarak ${selectedDistance.toFixed(2)} km • Estimasi Rp ${price.toLocaleString()}`;
}

// LOAD DRIVER
async function loadDrivers() {

    let { data } = await client
        .from("drivers")
        .select("*");

    data.forEach(d => {

        let marker = L.marker([d.lat, d.lng])
            .addTo(map)
            .bindPopup("🛵 " + d.name);

        driverMarkers.push({
            ...d,
            marker
        });
    });
}

// DISTANCE KM
function getDistance(lat1, lng1, lat2, lng2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// HARGA
function calculateTripPrice(km) {

    let base = 8000;
    let perKm = 2500;

    return Math.round(base + (km * perKm));
}

// ORDER
function orderRide() {

    if (!destinationMarker) {
        alert("Pilih tujuan dulu di peta");
        return;
    }

    document.getElementById("statusText").innerText =
        "Mencari driver... 🔍";

    setTimeout(() => {

        document.getElementById("statusText").innerText =
            "Driver ditemukan 🎉";

        document.getElementById("infoText").innerText =
            "Driver menuju lokasi kamu";

    }, 1500);
}

// CANCEL
function cancelRide() {

    document.getElementById("statusText").innerText =
        "Order dibatalkan ❌";

    document.getElementById("infoText").innerText = "";
}
