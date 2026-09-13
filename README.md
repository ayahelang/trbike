# TRBike

**Terbaik untuk Driver dan Penumpang**

Aplikasi transportasi online roda dua berbasis web dengan fokus transparan dan adil.

## Demo & Deploy
- Hosting: **GitHub Pages**
- Backend: **Firebase Authentication + Realtime Database**
- Stack: HTML · CSS · Vanilla JS · Firebase (versi gratis)

## Fitur MVP 1.0
- Register / Login (Email + Password)
- Role Penumpang & Driver
- Kalkulator tarif dengan breakdown lengkap (BBM trip + pickup, driver pool, service fee, pajak)
- Buat order (penumpang)
- Online / Offline (driver)
- Terima order (driver)
- Riwayat order realtime
- Wallet sederhana (hak driver)

## Dokumentasi
Semua dokumentasi ada di folder `docs/`:
- `01_PROJECT_OVERVIEW.md`
- `02_DATABASE_SCHEMA.md`
- `03_FARE_ALGORITHM.md`
- `04_SECURITY_RULES.md`
- `05_SETUP_GUIDE.md`

## Cara Setup Cepat
1. Buat project Firebase
2. Aktifkan **Authentication → Email/Password**
3. Buat **Realtime Database**
4. Pasang Security Rules (lihat `docs/04_SECURITY_RULES.md`)
5. Seed data `fareRules/current` (lihat `docs/05_SETUP_GUIDE.md`)
6. Isi `js/config.js` dengan config Firebase Anda
7. Deploy ke GitHub Pages (upload seluruh folder, `index.html` di root)

## Prinsip Desain
- Transparansi tarif
- Fairness bagi driver (driver pool = hak, bukan gaji)
- Pickup distance diperhitungkan
- UI clean minimal (putih · hitam · abu-abu)
- Mobile-first & fluid
- Siap migrasi ke mobile (Flutter / React Native) di kemudian hari

## Untuk Skripsi
Judul yang dipilih:  
**“Perancangan dan Pengembangan Sistem Transportasi Online TRBike Berbasis Arsitektur Client–Server dan Algoritma Tarif Adil”**

Dokumentasi di folder `docs/` sudah disiapkan agar mudah dipetakan ke BAB IV–VI skripsi.

---

Dibangun ulang dari konsep awal, dengan fokus pada kualitas kode, UI modern, dan kemudahan pengembangan lanjutan.
