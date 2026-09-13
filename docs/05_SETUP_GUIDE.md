# TRBike — Setup Guide (Firebase + GitHub Pages)

## 1. Buat Project Firebase

1. Buka [https://console.firebase.google.com](https://console.firebase.google.com)
2. Klik **Add project** → nama: `TRBike` (atau sesuai keinginan)
3. Nonaktifkan Google Analytics jika tidak dibutuhkan (opsional)
4. Tunggu project siap

## 2. Aktifkan Authentication

1. Di sidebar kiri → **Build → Authentication**
2. Klik **Get started**
3. Pilih **Email/Password** → Enable → Save

## 3. Buat Realtime Database

1. Sidebar → **Build → Realtime Database**
2. Klik **Create Database**
3. Pilih lokasi terdekat (asia-southeast1 jika tersedia)
4. Mulai dengan **locked mode** (kita akan ganti rules)

## 4. Pasang Security Rules

Copy isi file `docs/04_SECURITY_RULES.md` ke tab **Rules** lalu **Publish**.

## 5. Seed Data Awal (fareRules)

Di tab **Data**, buat struktur berikut secara manual atau via console:

```
fareRules
  └── current
        ├── fuelPricePerLiter: 12500
        ├── fuelEfficiencyKmPerLiter: 40
        ├── baseFare: 2500
        ├── serviceFeePercent: 0.17
        ├── taxPercent: 0.11
        ├── pools
        │     ├── maintenance: 0.10
        │     ├── labor: 0.10
        │     ├── health: 0.10
        │     ├── oldAge: 0.05
        │     ├── charity: 0.025
        │     └── food: 0.075
        ├── classMultipliers
        │     ├── standard: 1
        │     ├── comfort: 1.1
        │     └── premium: 1.2
        └── version: "1.0.0-mvp"
```

## 6. Ambil Config Firebase

1. Project Overview → ⚙️ Project settings
2. Scroll ke **Your apps** → klik ikon **Web** (`</>`)
3. Daftarkan app (nickname: TRBike Web)
4. Copy object `firebaseConfig`

## 7. Isi Config di Kode

Buka file `js/config.js` dan ganti dengan config milikmu:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "trbike-xxxx.firebaseapp.com",
  databaseURL: "https://trbike-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trbike-xxxx",
  storageBucket: "trbike-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 8. Deploy ke GitHub Pages

1. Buat repository baru di GitHub (contoh: `trbike`)
2. Upload semua file di folder `TRBike/` (index.html harus di root)
3. Settings → Pages → Source: Deploy from branch → `main` → `/ (root)`
4. Tunggu beberapa menit, lalu buka URL: `https://username.github.io/trbike`

## 9. Testing Lokal

Bisa pakai Live Server (VS Code) atau:

```bash
npx serve .
```

Pastikan sudah mengisi `js/config.js` yang benar.

## Checklist Sebelum Demo Skripsi
- [ ] Firebase Auth Email/Password aktif
- [ ] Realtime Database rules sudah dipublish
- [ ] fareRules/current sudah diisi
- [ ] Bisa register penumpang & driver
- [ ] Bisa hitung tarif + breakdown
- [ ] Bisa buat order & terima order
- [ ] UI responsif di mobile
