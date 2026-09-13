# TRBike — Algoritma Tarif Adil (Review & Perbaikan)

## Prinsip yang Dipertahankan
1. Setiap komponen biaya **transparan**.
2. **Pickup distance** dihitung (driver ke penumpang).
3. **Driver pool** adalah hak driver dari pembayaran penumpang.
4. Platform hanya mengambil service fee yang jelas.
5. Parameter dapat dikalibrasi lewat Firebase (bukan hardcode permanen).

## Parameter Default (Prototype)

| Parameter                    | Nilai     | Keterangan                          |
|-----------------------------|-----------|-------------------------------------|
| Harga BBM (Pertamax)        | Rp 12.500 | per liter                           |
| Efisiensi                   | 40 km/l   | asumsi motor                        |
| Base Fare                   | Rp 2.500  | biaya dasar                         |
| Service Fee                 | 17%       | dari (operating + driver pool)      |
| Pajak (PPN)                 | 11%       | dari service fee                    |
| Maintenance                 | 10%       | bagian driver pool                  |
| Labor (tenaga)              | 10%       | bagian driver pool                  |
| Health                      | 10%       | bagian driver pool                  |
| Old Age (hari tua)          | 5%        | bagian driver pool                  |
| Charity                     | 2.5%      | bagian driver pool                  |
| Food                        | 7.5%      | bagian driver pool                  |

**Total Driver Pool Percentage** = 45%

## Formula (Versi MVP yang diperjelas)

```
fuelPerKm          = fuelPricePerLiter / fuelEfficiencyKmPerLiter
tripFuel           = tripDistanceKm × fuelPerKm
pickupFuel         = pickupDistanceKm × fuelPerKm

operatingBase      = baseFare + tripFuel + pickupFuel
driverPool         = operatingBase × totalPoolPercent          // 45%
serviceFeeBase     = (operatingBase + driverPool) × serviceFeePercent
serviceFee         = serviceFeeBase × classMultiplier
tax                = serviceFeeBase × taxPercent × classMultiplier
subtotal           = (operatingBase + driverPool + serviceFeeBase) × classMultiplier
rawTotal           = subtotal + tax
total              = ceil(rawTotal / 500) × 500                 // dibulatkan ke Rp500

driverGross        = total - serviceFee - tax                   // hak driver
```

## Class Multiplier
- Standard : 1.0
- Comfort  : 1.1
- Premium  : 1.2

## Contoh Perhitungan
Trip 5 km, Pickup 1.5 km, Standard:

```
fuelPerKm     = 12500 / 40 = 312.5
tripFuel      = 5 × 312.5 = 1.562,5
pickupFuel    = 1.5 × 312.5 = 468,75
operatingBase = 2500 + 1562.5 + 468.75 = 4.531,25
driverPool    = 4531.25 × 0.45 ≈ 2.039
serviceFeeBase≈ (4531 + 2039) × 0.17 ≈ 1.117
subtotal      ≈ 7.687
tax           ≈ 123
rawTotal      ≈ 7.810
total         = 8.000 (setelah pembulatan ke 500)
driverGross   ≈ 8.000 - 1.117 - 123 ≈ 6.760
```

## Review & Catatan Perbaikan (untuk Skripsi)

### Yang Sudah Baik
- Transparansi komponen sangat jelas.
- Pickup distance masuk perhitungan (berbeda dari banyak kompetitor).
- Driver pool diposisikan sebagai **hak**, bukan gaji.
- Parameter bisa diubah tanpa deploy ulang kode (via `fareRules/current`).

### Kelemahan / Yang Perlu Diteliti Lebih Lanjut
1. **Target 20% lebih murah** belum di-enforce di formula.  
   Untuk mengimplementasikannya perlu:
   - Dataset harga kompetitor per kota / jarak
   - Constraint: `total ≤ competitor × 0.80` **DAN** `driverGross ≥ minimum viable`
   - Jika conflict → tampilkan exception yang auditable (bukan manipulasi tersembunyi)

2. **Persentase pool 45%** masih asumsi.  
   Perlu riset: berapa sebenarnya biaya perawatan, tenaga, dll per km di wilayah target.

3. **Pajak 11% hanya dari service fee**.  
   Perlu konsultasi akuntansi/perpajakan apakah model ini sesuai regulasi.

4. **Pembulatan ke Rp500** bisa menguntungkan/merugikan sedikit.  
   Bisa diganti ke Rp100 jika ingin lebih presisi.

5. **Client-side calculation** (MVP).  
   Untuk produksi, hitung di Cloud Functions agar tidak bisa dimanipulasi.

### Rekomendasi untuk Bab Pengujian Skripsi
- Buat tabel perbandingan tarif TRBike vs kompetitor (GoRide, GrabBike, Maxim, dll) pada beberapa skenario jarak.
- Uji sensitivitas: ubah harga BBM ±10%, ubah efisiensi, lihat dampak ke total & driverGross.
- Uji fairness: pastikan driverGross selalu > biaya BBM + effort minimum.

## File Terkait
- Implementasi: `js/fare.js`
- Seed data: `docs/seed-data.json`
- Schema: `docs/02_DATABASE_SCHEMA.md`
