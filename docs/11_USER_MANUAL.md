# TRBike — Panduan Pengguna (User Manual)

**Versi aplikasi:** MVP v2.8+ · Multi-layanan  
**Platform:** Web (GitHub Pages) + Firebase Realtime Database  

TRBike adalah aplikasi ojek & pengantaran berbasis motor yang menggabungkan pola layanan **Gojek, Grab, Maxim, dan ShopeeFood**, dengan fokususan tarif yang transparan untuk driver dan platform.

---

## Daftar isi
1. [Layanan yang tersedia](#1-layanan-yang-tersedia)
2. [Panduan Penumpang / Pelanggan](#2-panduan-penumpang--pelanggan)
3. [Panduan Driver / Mitra](#3-panduan-driver--mitra)
4. [Tarif & pembayaran](#4-tarif--pembayaran)
5. [Verifikasi identitas & keamanan](#5-verifikasi-identitas--keamanan)
6. [Tips penggunaan](#6-tips-penggunaan)

---

## 1. Layanan yang tersedia

Inspirasi katalog: GoRide/GrabBike, GoFood/GrabFood/ShopeeFood, GoSend/GrabExpress, GoMart/GrabMart, GoShop, Maxim Delivery, dll.

| Kode | Nama | Ikon | Kegunaan |
|------|------|------|----------|
| `ride` | **TRRide** | 🛵 | Antar penumpang ke tujuan |
| `food` | **TRFood** | 🍜 | Ambil makanan di resto/warung, antar ke penerima |
| `send` | **TRSend** | 📦 | Kirim paket / dokumen instan dalam kota |
| `mart` | **TRMart** | 🛒 | Belanja minimarket/supermarket lalu diantar |
| `shop` | **TRShop** | 🛍️ | Titip belanja di toko/pasar sesuai daftar |
| `pharmacy` | **TRObat** | 💊 | Ambil obat di apotek, antar ke rumah/klinik |
| `laundry` | **TRCuci** | 👕 | Antar-jemput laundry |
| `gift` | **TRGift** | 🎁 | Kirim bunga, kue, hadiah |
| `docs` | **TRDocs** | 📄 | Antar dokumen kantor/kampus |
| `custom` | **TRBantu** | ✨ | Bantuan lain dalam radius motor |

Siapa pun bisa memesan: **penumpang, toko, salon, apotek, resto, UMKM**, selama bisa mengisi titik ambil & tujuan.

---

## 2. Panduan Penumpang / Pelanggan

### 2.1 Daftar & masuk
1. Buka aplikasi TRBike di browser.
2. Klik **Masuk** → daftar dengan email/password atau **Google**.
3. Pilih peran **Penumpang** saat daftar.
4. (Disarankan) buka **Profil** → unggah selfie + KTP → **Ajukan verifikasi**.

### 2.2 Memilih layanan (layar depan)
Setelah login, sheet bawah menampilkan **grid layanan** (gaya Gojek/Grab).
1. Ketuk salah satu tile (mis. TRFood / TRSend).
2. Isi **tujuan** (dan jika diminta: titik ambil toko, catatan barang).
3. Sesuaikan pin **Jemput** & **Tujuan** di peta.
4. **Cek Tarif** → lihat total & rincian.
5. Untuk cash: transfer **biaya layanan + PPN** ke rekening TRBike, unggah bukti.
6. **Cari Driver**.

### 2.3 Membaca rincian tarif
- **Untuk Driver** (tombol collapse `+` / `−`): BBM jemput, BBM tujuan, perawatan, makan & kesehatan, jasa driver.
- Di luar collapse: Biaya layanan, Tarif sebelum PPN, PPN, **Total dibayar pelanggan**.
- Cash: bagian layanan+PPN ke TRBike; sisanya cash ke driver di tujuan.

### 2.4 Fitur peta (akun terverifikasi)
- Ikon **🛵 putih** = driver terverifikasi; **abu** = belum.
- Ketuk motor → **Profil Driver**: rating, layanan, radius cover.
- Bisa **Pesan driver ini** atau **Kirim tips** kapan saja.

### 2.5 Pesanan & tracking
- Daftar pesanan di sheet (status: menunggu / diterima / selesai / batal).
- Saat driver menerima, **live tracking** aktif.
- Setelah selesai: rating bintang + tips opsional.

### 2.6 Keluar / hapus akun
- **Keluar** di kanan atas — chip profil hilang, kembali ke mode tamu.
- **Profil → Hapus akun saya** — data profil dihapus (permanen).

---

## 3. Panduan Driver / Mitra

### 3.1 Daftar sebagai Driver
1. Daftar → pilih peran **Driver**, atau di Profil ketuk **Ubah peran jadi Driver**.
2. Lengkapi verifikasi identitas (disarankan agar penumpang lebih percaya).

### 3.2 Aktifkan layanan
Di dashboard driver, bagian **Layanan yang saya aktifkan**:
- Centang layanan yang Anda mau terima (minimal 1).
- Contoh: hanya TRRide + TRSend, atau semua termasuk TRFood & TRObat.
- Pelanggan melihat driver yang **aktif** di layanan tersebut.

### 3.3 Go Online
1. Izinkan lokasi browser.
2. Ketuk **Go Online**.
3. Order masuk muncul di **Order masuk** (status `requested`).
4. **Terima** order → antar sesuai pin → selesaikan trip.

### 3.4 Peta untuk driver terverifikasi
- Pin **kuning “Saya”** = lokasi motor Anda (cek GPS berfungsi).
- Motor driver lain di sekitar — bantu pilih area yang tidak terlalu padat order.

### 3.5 Preferensi
- Hanya penumpang terverifikasi.
- (Driver wanita terverifikasi) hanya penumpang wanita.

### 3.6 Pendapatan
- **Saldo / Total / Order** di dashboard.
- Komponen “Untuk Driver” dari tarif (BBM + perawatan + makan & kesehatan + jasa).
- Tips dari penumpang masuk wallet.

---

## 4. Tarif & pembayaran

### Tarif BBM / km
| Waktu | Tarif |
|--------|--------|
| Jam sibuk | Rp **850** / km |
| Tidak sibuk (09:00–11:00 & 14:00–16:00) | Rp **600** / km |

### Komponen (dari total BBM)
- Perawatan kendaraan 10%
- Makan & kesehatan 13%
- Jasa driver 77%
- Biaya layanan platform 10%
- PPN 11% × (tarif sebelum PPN)
- Total dibulatkan ke atas kelipatan Rp 500

### Cash
1. Transfer **biaya layanan + PPN** ke Dana / Gopay TRBike (+ upload bukti).
2. Sisa bayar **cash ke driver** di tujuan.

### Escrow (konsep)
Uang masuk platform → platform menahan layanan+PPN → transfer sisanya ke driver.

---

## 5. Verifikasi identitas & keamanan

- Upload selfie memegang KTP + foto KTP (NIK/alamat boleh diburamkan).
- Manfaat: penumpang & driver saling lebih percaya; fitur peta profil & peer motor aktif setelah verifikasi.
- Preferensi “hanya lawan terverifikasi” / “hanya wanita” (untuk akun wanita terverifikasi).

---

## 6. Tips penggunaan

**Pelanggan**
- Verifikasi akun untuk akses penuh peta & tips ke driver.
- Isi catatan barang jelas (TRFood / TRShop / TRObat).
- Geser pin agar titik jemput akurat.

**Driver**
- Aktifkan hanya layanan yang siap Anda kerjakan.
- Online di area sepi kompetitor (lihat motor lain di peta).
- Jaga rating dengan ketepatan waktu.

**UMKM / toko / resto / apotek**
- Pakai TRSend / TRFood / TRObat dari HP toko.
- Isi titik ambil = alamat outlet; tujuan = alamat pelanggan.

---

## Bantuan teknis singkat

| Masalah | Solusi |
|---------|--------|
| Chip profil tidak hilang saat logout | Hard refresh (Ctrl+Shift+R); pastikan versi terbaru |
| Ikon Google hilang | Jangan ganggu tombol saat loading; sudah diperbaiki di v2.7+ |
| Daftar driver tetap penumpang | Pakai email baru atau **Ubah peran jadi Driver** di Profil |
| Marker peta kosong | Login + izinkan lokasi; butuh user lain online di radius |
| Rules Firebase | Publish `docs/firebase-rules.json` (users, drivers, rides, presence, tips, fareRules) |

---

*Dokumen ini mengikuti fitur TRBike MVP multi-layanan. Untuk setup teknis lihat `docs/05_SETUP_GUIDE.md` dan `README.md`.*
