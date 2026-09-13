# TRBike — Algoritma Tarif v2.1

## Formula
```
totalBBM           = (tripKm + pickupKm) × 350

perawatan          = 10% × totalBBM
makanKesehatan     = 13% × totalBBM
jasaDriver         = 77% × totalBBM
pendapatanBersih   = perawatan + makanKesehatan + jasaDriver   (= totalBBM)

biayaLayanan       = 17% × totalBBM          → hak TRBike

tarifSebelumPPN    = totalBBM + perawatan + makanKesehatan
                     + jasaDriver + biayaLayanan
                   = 2×totalBBM + biayaLayanan

PPN                = 11% × tarifSebelumPPN
totalPenumpang     = ceil((tarifSebelumPPN + PPN) / 500) × 500
```
