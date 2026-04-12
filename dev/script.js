const SUPABASE_URL = "https://njraifhxvyvfsgergqav.supabase.co";
const SUPABASE_KEY = "sb_publishable_PBk-fCMKHLk0hVFqJ0XdGg_dwOgYET0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// INIT MAP (Jakarta)
const map = L.map('map').setView([-6.2, 106.8], 13);

// TILE
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'TRBike Map'
}).addTo(map);

// LOAD DRIVERS
async function loadDrivers() {
    let { data, error } = await client
        .from("drivers")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(d => {
        L.marker([d.lat, d.lng])
            .addTo(map)
            .bindPopup("🛵 " + d.name);
    });
}

loadDrivers();