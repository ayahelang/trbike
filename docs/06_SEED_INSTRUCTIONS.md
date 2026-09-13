# Cara Import Seed Data ke Firebase Realtime Database

File: `seed-data.json`

## Opsi 1 — Manual (paling aman untuk pemula)

1. Buka Firebase Console → Realtime Database → tab **Data**
2. Klik ikon **+** di root
3. Buat node `fareRules` → di dalamnya `current`
4. Isi field-field sesuai isi `seed-data.json` (atau copy-paste satu per satu)
5. Lakukan yang sama untuk `system/config`

## Opsi 2 — Import JSON (lebih cepat)

1. Di tab **Data**, klik ikon **⋮** (tiga titik) di pojok kanan atas
2. Pilih **Import JSON**
3. Upload file `docs/seed-data.json`
4. Pastikan tidak menimpa data penting lain (sebaiknya database masih kosong)

## Verifikasi

Setelah import, struktur harus terlihat seperti:

```
fareRules
  └── current
        ├── fuelPricePerLiter: 12500
        ├── ...
system
  └── config
        ├── appName: "TRBike"
        └── ...
```

Aplikasi akan otomatis membaca parameter dari `fareRules/current`.
Jika node ini tidak ada, aplikasi memakai nilai default di `js/fare.js`.
