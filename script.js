const SUPABASE_URL = "https://njraifhxvyvfsgergqav.supabase.co";
const SUPABASE_KEY = "sb_publishable_PBk-fCMKHLk0hVFqJ0XdGg_dwOgYET0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DEFAULT fallback
let userLat = -6.2;
let userLng = 106.8;

let map;
let userMarker;
let driverMarkers = [];
let activeDriver = null;
let rideInterval = null;
let travelDistance = 0;

// INIT APP
window.onload = () => {
    initMap();
    getUserLocation();
    loadDrivers();
};

// MAP
function initMap() {
    map = L.map('map').setView([userLat, userLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// GPS USER
function getUserLocation() {

    if (!navigator.geolocation) {
        setUserMarker();
        return;
    }

    navigator.geolocation.getCurrentPosition(

        position => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;

            map.setView([userLat, userLng], 15);

            setUserMarker();
        },

        error => {
            console.log("GPS ditolak / gagal");
            setUserMarker();
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// MARKER USER
function setUserMarker() {

    if (userMarker) {
        map.removeLayer(userMarker);
    }

    userMarker = L.marker([userLat, userLng])
        .addTo(map)
        .bindPopup("📍 Posisi Kamu")
        .openPopup();
}

// LOAD DRIVER
async function loadDrivers() {

    let { data, error } = await client
        .from("drivers")
        .select("*");

    if (error) {
        console.log(error);
        return;
    }

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

// DISTANCE
function getDistance(lat1, lng1, lat2, lng2) {
    return Math.sqrt(
        Math.pow(lat1 - lat2, 2) +
        Math.pow(lng1 - lng2, 2)
    );
}

// ORDER
function orderRide() {

    if (driverMarkers.length === 0) {
        alert("Driver belum tersedia");
        return;
    }

    document.getElementById("statusText").innerText =
        "Mencari driver... 🔍";

    let nearest = null;
    let minDist = 999;

    driverMarkers.forEach(d => {

        let dist = getDistance(userLat, userLng, d.lat, d.lng);

        if (dist < minDist) {
            minDist = dist;
            nearest = d;
        }
    });

    setTimeout(() => {

        activeDriver = nearest;

        nearest.marker.setIcon(
            L.icon({
                iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                iconSize: [32, 32]
            })
        );

        document.getElementById("statusText").innerText =
            "Driver ditemukan 🎉";

        document.getElementById("infoText").innerText =
            nearest.name;

        map.setView([nearest.lat, nearest.lng], 16);

    }, 1500);
}

// CANCEL
function cancelRide() {
    document.getElementById("statusText").innerText =
        "Order dibatalkan ❌";
}