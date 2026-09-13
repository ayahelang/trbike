# TRBike — Algoritma Tarif (v2 — BBM Rp350/km)

## Ketentuan
1. **BBM** = **Rp 350 / km** (jarak trip + jarak jemput)
2. Dari **total BBM** (hak driver):
   - **10%** tabungan perawatan kendaraan
   - **13%** tabungan makan & kesehatan
   - **77%** jasa driver  
   → Jumlah = **100% total BBM = Pendapatan bersih driver**
3. **Biaya layanan** = **17% × total BBM** → hak **TRBike**
4. **Tarif sebelum PPN** = total BBM + biaya layanan
5. **PPN 11%** = 11% × tarif sebelum PPN
6. **Total dibayar penumpang** = tarif sebelum PPN + PPN (dibulatkan ke Rp500)

## Contoh
Trip 22,1 km · Jemput 1,7 km · Standard:

```
totalBBM        = (22,1 + 1,7) × 350 = 8.330
perawatan       = 10% × 8.330 = 833
makanKesehatan  = 13% × 8.330 = 1.082,9
jasaDriver      = 77% × 8.330 = 6.414,1
pendapatanBersih= 8.330

biayaLayanan    = 17% × 8.330 = 1.416,1
sebelumPPN      = 8.330 + 1.416,1 = 9.746,1
PPN 11%         = 1.072,07
rawTotal        = 10.818,17
total (÷500)    = Rp 11.000
```

## Catatan
- Persentase biaya layanan (17%) bisa diubah di `fareRules/current` tanpa ubah kode.
- Kelas Comfort/Premium mengalikan komponen jarak & layanan sesuai multiplier.
