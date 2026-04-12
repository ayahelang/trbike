const SUPABASE_URL = "https://njraifhxvyvfsgergqav.supabase.co";
const SUPABASE_KEY = "sb_publishable_PBk-fCMKHLk0hVFqJ0XdGg_dwOgYET0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// INIT MAP
const map = L.map('map').setView([-6.2, 106.8], 13);

// TILE
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// USER POSITION (fake center dulu)
const userLat = -6.2;
const userLng = 106.8;

// MARKER USER
const userMarker = L.marker([userLat, userLng]).addTo(map)
    .bindPopup("📍 Kamu");

// SIMPAN DRIVER
let driverMarkers = [];

// LOAD DRIVER
async function loadDrivers() {
    let { data } = await client.from("drivers").select("*");

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

loadDrivers();

// HITUNG JARAK
function getDistance(lat1, lng1, lat2, lng2) {
    return Math.sqrt(
        Math.pow(lat1 - lat2, 2) +
        Math.pow(lng1 - lng2, 2)
    );
}

// ORDER SYSTEM
function orderRide() {
    if (driverMarkers.length === 0) return;

    let nearest = null;
    let minDist = 999;

    driverMarkers.forEach(d => {
        let dist = getDistance(userLat, userLng, d.lat, d.lng);

        if (dist < minDist) {
            minDist = dist;
            nearest = d;
        }
    });

    // highlight driver
    nearest.marker.setIcon(
        L.icon({
            iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            iconSize: [32, 32]
        })
    );

    // hitung tarif (simple dulu)
    let price = Math.round(10000 + minDist * 100000);

    // update UI
    document.getElementById("statusText").innerText = "Driver ditemukan 🎉";
    document.getElementById("infoText").innerText =
        `${nearest.name} • Rp ${price.toLocaleString()}`;

    // zoom ke driver
    map.setView([nearest.lat, nearest.lng], 15);
}