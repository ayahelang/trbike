# TRBike — Project Overview

**Motto:** Terbaik untuk Driver dan Penumpang

**Versi:** MVP 1.0 (GitHub Pages + Firebase)

**Tujuan:**
Aplikasi transportasi online roda dua berbasis web yang mengedepankan transparansi tarif, fairness bagi driver, dan pengalaman pengguna yang bersih serta responsif.

## Tujuan Akademik (Skripsi)
Judul:  
**“Perancangan dan Pengembangan Sistem Transportasi Online TRBike Berbasis Arsitektur Client–Server dan Algoritma Tarif Adil”**

MVP ini menjadi prototipe fungsional yang dapat diuji, didemokan, dan dievaluasi.

## Stack Teknologi (MVP)
| Layer              | Teknologi                          | Alasan                                      |
|--------------------|------------------------------------|---------------------------------------------|
| Frontend           | HTML5, CSS3, Vanilla JS            | Ringan, mudah di-deploy ke GitHub Pages     |
| Auth               | Firebase Authentication            | Gratis, aman, mudah                         |
| Database           | Firebase Realtime Database         | Realtime, gratis, cocok untuk order status  |
| Hosting            | GitHub Pages                       | Gratis, sederhana                           |
| Maps (fase lanjut) | Leaflet / Google Maps JS           | Opsional                                    |

## Prinsip Desain
1. **Transparansi** — Setiap komponen biaya ditampilkan jelas.
2. **Fairness** — Driver pool adalah hak driver, bukan gaji platform.
3. **Pickup Distance** — Jarak driver menuju penumpang dihitung.
4. **Clean & Energetic** — UI putih dominan + hitam + abu-abu.
5. **Mobile-first** — Responsif dan fluid.
6. **Migrasi mudah** — Struktur data & logic siap dipindah ke Flutter/React Native.

## Fitur MVP 1.0
- Register / Login (Email + Password)
- Role: Penumpang & Driver
- Hitung tarif dengan breakdown lengkap
- Buat order (penumpang)
- Online / Offline (driver)
- Terima order (driver)
- Riwayat order
- Wallet sederhana (hak driver)
- Status order realtime

## Fitur yang Ditunda (Fase Berikutnya)
- Realtime GPS tracking
- Matching otomatis berdasarkan lokasi
- KYC foto & verifikasi kendaraan
- Payment gateway
- Tip & rating detail
- Admin panel
- Push notification
- Scan QR radius 1 km

## Struktur Folder
```
TRBike/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── auth.js
│   ├── fare.js
│   ├── passenger.js
│   ├── driver.js
│   └── app.js
├── assets/
├── docs/
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_DATABASE_SCHEMA.md
│   ├── 03_FARE_ALGORITHM.md
│   ├── 04_SECURITY_RULES.md
│   └── 05_SETUP_GUIDE.md
└── README.md
```
