# Fitur Keselamatan & Fairness TRBike (v1.5)

## Pembatalan + kompensasi BBM
Jika penumpang membatalkan **setelah driver menerima order**:
- Charge = **2 × BBM × jarak jemput** (pickupDistanceKm)
- Nominal masuk ke **wallet driver**
- Ditampilkan di detail pesanan penumpang & panel driver

## Tips & rating
- Bintang 1–5 + tips (Rp)
- Disimpan di ride + `drivers/{id}/feedback`
- Tips menambah saldo driver; rating di-average

## Verifikasi identitas (KYC)
- Upload selfie memegang KTP + foto KTP (NIK/alamat boleh ditutup)
- MVP demo: auto-approve setelah submit
- Produksi: review admin

## Filter preferensi (bisa diubah kapan saja)
**Penumpang**
- Default: hanya driver terverifikasi
- Wanita terverifikasi: opsi hanya driver wanita

**Driver**
- Opsi hanya penumpang terverifikasi
- Driver wanita terverifikasi: opsi hanya penumpang wanita

## Storage
Aktifkan Firebase Storage jika ingin URL foto nyata.
Rules Storage contoh: hanya owner yang write ke `kyc/{uid}/...`
