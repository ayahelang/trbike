# TRBike — Algoritma Tarif v2.3

## Tarif BBM per KM
- **Jam sibuk (default)**: Rp 700 / km  
- **Jam tidak sibuk**: Rp 550 / km  
  - 09:00 – 11:00  
  - 14:00 – 16:00  

## Formula (ditampilkan ke pelanggan)
```
BBM penjemputan     = fuelPerKm × KM ke penjemputan
BBM ke tujuan       = fuelPerKm × KM ke tujuan
totalBBM            = BBM penjemputan + BBM ke tujuan

Perawatan kendaraan = 10% × totalBBM
Makan & kesehatan   = 13% × totalBBM
Jasa driver         = 77% × totalBBM
Biaya layanan       = 10% × totalBBM

Tarif sebelum PPN   = totalBBM + Perawatan + Makan & kesehatan + Jasa driver + Biaya layanan
PPN                 = 11% × Tarif sebelum PPN
Total dibayar       = Tarif sebelum PPN + PPN
                    (dibulatkan ke atas kelipatan Rp 500)
```

## Pembagian pembayaran

### Opsi Cash
- **Ke rekening TRBike** (wajib bukti TF/QRIS sebelum cari driver):  
  `Biaya layanan + PPN`
- **Cash ke driver di tujuan**:  
  `BBM + Perawatan + Makan & kesehatan + Jasa driver`  
  (cara bayar terserah penumpang–driver)

### Opsi Escrow
- Uang masuk ke TRBike dari escrow.  
- TRBike memecah:  
  - Tetap di TRBike: `Biaya layanan + PPN`  
  - Transfer ke rekening driver: sisanya (sama seperti bagian cash ke driver di atas)

## Catatan internal
- `pendapatanBersih` driver (pool) = Perawatan + Makan + Jasa = 100% × totalBBM  
- Multiplier kelas (comfort/premium) diterapkan pada totalBBM jika dipakai.
