const SUPABASE_URL = "https://njraifhxvyvfsgergqav.supabase.co";
const SUPABASE_KEY = "sb_publishable_PBk-fCMKHLk0hVFqJ0XdGg_dwOgYET0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// MAP
const map = L.map('map').setView([-6.2, 106.8], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'TRBike',
    maxZoom: 19
}).addTo(map);

// USER
const userLat = -6.2;
const userLng = 106.8;

const userMarker = L.marker([userLat, userLng])
    .addTo(map)
    .bindPopup("📍 Kamu")
    .openPopup();

// STATE
let driverMarkers = [];
let activeDriver = null;
let travelDistance = 0;
let rideInterval = null;

// LOAD DRIVER
async function loadDrivers() {
    let { data, error } = await client.from("drivers").select("*");

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(d => {
        let marker = L.marker([d.lat, d.lng])
            .addTo(map)
            .bindPopup("🛵 " + d.name);

        driverMarkers.push({
            id: d.id,
            name: d.name,
            lat: d.lat,
            lng: d.lng,
            marker
        });
    });
}

loadDrivers();


// 🚀 REALTIME UPDATE
client
    .channel('drivers-channel')
    .on(
        'postgres_changes',
        {
            event: 'UPDATE',
            schema: 'public',
            table: 'drivers'
        },
        payload => {
            const updated = payload.new;

            let driver = driverMarkers.find(d => d.id === updated.id);

            if (driver) {
                driver.lat = updated.lat;
                driver.lng = updated.lng;

                driver.marker.setLatLng([updated.lat, updated.lng]);
            }
        }
    )
    .subscribe();


// DISTANCE
function getDistance(lat1, lng1, lat2, lng2) {
    return Math.sqrt(
        Math.pow(lat1 - lat2, 2) +
        Math.pow(lng1 - lng2, 2)
    );
}


// 💰 FAIR PRICING
function calculatePrice(pickupDist, tripDist = 1) {
    const base = 8000;
    const pickupCost = pickupDist * 8000;
    const tripCost = tripDist * 3000;
    const timeCost = 2000;

    return Math.round(base + pickupCost + tripCost + timeCost);
}


// ⚖️ KOMPENSASI
function calculateCompensation(distance) {
    const bbm = distance * 5000;
    const capek = 3000;
    const waktu = 2000;

    return Math.round(bbm + capek + waktu);
}


// 🚀 GERAK DRIVER (SIMULASI LOCAL)
function moveDriverToUser(driver) {
    let lat = driver.lat;
    let lng = driver.lng;

    travelDistance = 0;

    rideInterval = setInterval(() => {

        let oldLat = lat;
        let oldLng = lng;

        lat += (userLat - lat) * 0.05;
        lng += (userLng - lng) * 0.05;

        driver.marker.setLatLng([lat, lng]);

        let stepDist = getDistance(oldLat, oldLng, lat, lng);
        travelDistance += stepDist;

        document.getElementById("statusText").innerText = "Driver menuju kamu 🚗";

        let dist = getDistance(lat, lng, userLat, userLng);

        if (dist < 0.001) {
            clearInterval(rideInterval);

            document.getElementById("statusText").innerText = "Driver tiba 🎉";
            document.getElementById("infoText").innerText = "Silakan naik 🙏";
        }

    }, 300);
}


// ORDER
function orderRide() {

    if (driverMarkers.length === 0) {
        alert("Driver belum tersedia");
        return;
    }

    document.getElementById("statusText").innerText = "Mencari driver... 🔍";
    document.getElementById("infoText").innerText = "";

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

        let price = calculatePrice(minDist);

        document.getElementById("statusText").innerText = "Driver ditemukan 🎉";
        document.getElementById("infoText").innerText =
            `${nearest.name} • Rp ${price.toLocaleString()}`;

        map.setView([nearest.lat, nearest.lng], 15);

        moveDriverToUser(nearest);

    }, 1500);
}


// ❌ CANCEL
function cancelRide() {

    if (!activeDriver) return;

    clearInterval(rideInterval);

    let kompensasi = calculateCompensation(travelDistance);

    document.getElementById("statusText").innerText = "Order dibatalkan ❌";
    document.getElementById("infoText").innerText =
        `Kompensasi driver: Rp ${kompensasi.toLocaleString()}`;

    activeDriver = null;
}