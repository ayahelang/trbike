# Firebase Storage (Gratis) + Pembayaran + QRIS + Escrow

## 1. Apakah Storage masih gratis?

**Ya**, di paket **Spark (no-cost)**:
- Storage: **5 GB**
- Download: **1 GB/hari**
- Upload operasi terbatas tapi cukup untuk KYC MVP

Cocok selama foto dikompres (TRBike otomatis resize max 1024px, target ~300KB).

### Aktifkan Storage
1. Firebase Console → **Build → Storage** → Get started  
2. Mulai dalam mode **production** atau test  
3. Pilih lokasi (asia-southeast1 jika ada)  
4. Tab **Rules** — contoh untuk KYC user sendiri:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kyc/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 1 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

5. Pastikan `storageBucket` di `js/config.js` benar (dari Project Settings)

### Kompresi di TRBike
- File mentah max 8 MB ditolak  
- Auto resize sisi terpanjang **1024px**  
- JPEG quality menurun sampai ~**300KB**  
- Hanya **URL** yang disimpan di Realtime Database (bukan base64)

---

## 2. Cash + wajib bayar biaya layanan dulu

Alur MVP:
1. Penumpang pilih **Cash di tujuan**
2. Transfer **biaya layanan + PPN** ke:
   - **Dana** 085159922358  
   - **Gopay** 085158822803  
3. Upload **bukti transfer** (dikompres)  
4. Baru bisa **Cari Driver**  
5. Sisa tarif dibayar cash ke driver di tujuan  

`serviceFee + tax (PPN)` dari algoritma tarif = komponen yang dilunasi dulu ke TRBike. Sisanya cash ke driver.

---

## 3. Cara dapat QRIS (Dana / Gopay)

### Opsi A — QR terima di aplikasi (paling cepat, personal)
1. Buka app **Dana** atau **Gopay / Gojek**  
2. Menu **Terima / QR code / Tampilkan QR**  
3. Screenshot QR  
4. Simpan sebagai `assets/qris.png` di repo TRBike  
5. Deploy ulang — aplikasi akan menampilkan QR itu di form bayar  

Catatan: QR personal biasanya untuk **transfer antar pengguna**, bukan merchant resmi. Untuk bisnis formal lebih baik opsi B.

### Opsi B — QRIS Merchant (resmi)
1. Daftar **GoPay Merchant / Midtrans / Xendit / Dana Business**  
2. Setelah approved, dapat **QRIS statis** atau dinamis API  
3. QRIS statis: pasang file gambar sama seperti opsi A  
4. QRIS dinamis: butuh backend (Cloud Functions) generate per transaksi  

Untuk skripsi/MVP: **Opsi A atau QRIS statis merchant** sudah cukup didokumentasikan.

---

## 4. Uang ditahan dulu (escrow) sampai antar selesai — bisakah?

### Real escrow (payment gateway)
Ya, dengan **Midtrans / Xendit / DOKU**:
1. Penumpang bayar full ke payment gateway  
2. Status: `pending` / `capture`  
3. Setelah order `completed`, admin/system **release** ke rekening TRBike, lalu bagi ke driver  
4. Membutuhkan: akun merchant, webhook, sering **backend** (Cloud Functions)

Ini **bukan** fitur bawaan Firebase gratis.

### Simulasi escrow di TRBike (gratis / MVP)
1. Penumpang bayar **biaya layanan + PPN** dulu (bukti upload)  
2. Tarif utama: **cash ke driver** setelah sampai  
3. Atau: penumpang TF full ke Dana/Gopay TRBike, admin **manual** cairkan ke driver setelah cek status `completed`  

Tanpa payment gateway, “penahanan otomatis” hanya bisa **manual** atau dengan backend + Midtrans.

### Rekomendasi tahap
| Tahap | Cara |
|-------|------|
| Skripsi / MVP | Fee dulu + cash + bukti TF |
| Produksi kecil | Midtrans Snap (bayar full) + cair manual |
| Produksi penuh | Midtrans + split / payout driver + webhook |

---

## 5. Live tracking
Saat status `accepted` / `in_trip`:
- Penumpang & driver publish GPS ke `rides/{id}/passengerLoc` & `driverLoc`
- Lawan transaksi melihat marker realtime di peta

Butuh izin lokasi di HP + HTTPS (GitHub Pages sudah HTTPS).
