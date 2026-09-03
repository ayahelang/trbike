# TRBIKE MVP — GitHub Pages + Supabase

Prototype akademik TRBIKE — **Terbaik untuk Driver dan Penumpang**.

## Isi
- `index.html` — frontend static.
- `css/style.css` — UI responsive.
- `js/config.js` — konfigurasi Supabase.
- `js/app.js` — auth, kalkulator tarif, order dan dashboard driver.
- `sql/supabase_schema.sql` — database, RLS dan tabel fondasi.

## Setup Supabase
1. Buat project Supabase.
2. Buka SQL Editor dan jalankan `sql/supabase_schema.sql`.
3. Aktifkan Email Authentication.
4. Salin Project URL dan publishable/anon key.
5. Isi `js/config.js`.

**Jangan pernah memasukkan `service_role` key ke frontend/GitHub Pages.**

## Deploy GitHub Pages
Upload seluruh isi folder ke repository dengan `index.html` di root.
Lalu GitHub: **Settings → Pages → Deploy from branch → main → /(root)**.

## Parameter prototype
Pertamax Rp12.500/liter, efisiensi 40 km/l, base Rp2.500, service 17%, pajak 11%.
Pool: perawatan 10%, tenaga 10%, kesehatan 10%, hari tua 5%, charity 2,5%, makan 7,5%.

Angka ini **parameter prototype**, bukan tarif resmi dan harus divalidasi secara hukum, akuntansi, pasar, serta riset lapangan.

## Belum production-ready
Belum mencakup GPS realtime/map, matching kompleks, KYC/KTP, foto kendaraan, geofencing, ETA realtime, cancel compensation otomatis, QR scan, push notification suara/getar, payment gateway, withdrawal, tip/loyalty, anti-fraud, admin, audit ledger penuh, dan compliance.

Untuk produksi, perhitungan uang sebaiknya dilakukan server-side/transactional RPC dan menggunakan ledger immutable; jangan mempercayai nominal dari browser.
