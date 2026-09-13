# Checklist Pengujian TRBike (untuk Skripsi)

Gunakan checklist ini untuk **BAB VI — Pengujian & Hasil**.

## 1. Functional Testing

### Auth
| No | Skenario | Hasil yang diharapkan | Pass/Fail | Keterangan |
|----|----------|----------------------|-----------|------------|
| 1 | Register penumpang (email) | Akun terbuat, masuk dashboard penumpang | | |
| 2 | Register driver (email) | Akun terbuat, masuk dashboard driver | | |
| 3 | Login email benar | Masuk sesuai role | | |
| 4 | Login email salah | Pesan error jelas | | |
| 5 | Login Google sebagai penumpang (akun baru) | Profil passenger dibuat | | |
| 6 | Login Google sebagai driver (akun baru) | Profil driver + wallet dibuat | | |
| 7 | Logout | Kembali ke layar auth | | |

### Penumpang
| No | Skenario | Hasil yang diharapkan | Pass/Fail | Keterangan |
|----|----------|----------------------|-----------|------------|
| 8 | Hitung tarif (isi jarak) | Breakdown tampil (BBM, pool, fee, pajak, total) | | |
| 9 | Pesan order | Status "Menunggu", muncul di daftar | | |
| 10 | Batalkan order (status requested) | Status jadi "Dibatalkan" | | |
| 11 | Coba batalkan order yang sudah accepted | Gagal / tidak bisa | | |

### Driver
| No | Skenario | Hasil yang diharapkan | Pass/Fail | Keterangan |
|----|----------|----------------------|-----------|------------|
| 12 | Go Online | Badge ONLINE | | |
| 13 | Lihat order masuk | Order requested muncul | | |
| 14 | Ambil order | Status accepted, pindah ke Perjalanan Aktif | | |
| 15 | Selesaikan order | Status completed, saldo bertambah = driverGross | | |
| 16 | Go Offline | Badge OFFLINE | | |

## 2. Algoritma Tarif (Sample)

Hitung manual vs sistem untuk 3 skenario:

| Trip (km) | Pickup (km) | Kelas | Total sistem | Total manual | Sesuai? |
|-----------|-------------|-------|--------------|--------------|---------|
| 3 | 1 | standard | | | |
| 5 | 1.5 | comfort | | | |
| 10 | 2 | premium | | | |

Rumus: lihat `docs/03_FARE_ALGORITHM.md`

## 3. Realtime

| No | Skenario | Hasil |
|----|----------|-------|
| 17 | Penumpang buat order → driver (tab lain) melihat tanpa refresh | |
| 18 | Driver terima → penumpang melihat status berubah | |
| 19 | Driver selesaikan → wallet driver update | |

## 4. UI / UX

| No | Aspek | Catatan |
|----|-------|---------|
| 20 | Mobile (lebar < 400px) | Layout tidak rusak |
| 21 | Breakdown tarif terbaca jelas | |
| 22 | Tidak ada biaya tersembunyi di UI | |
| 23 | Wording "hak driver" (bukan gaji) | |

## 5. Keamanan Dasar

| No | Skenario | Hasil |
|----|----------|-------|
| 24 | User A tidak bisa batalkan order user B | |
| 25 | Domain tidak di-authorized → Google login gagal (sesuai rules) | |
| 26 | Rules Firebase: unauthenticated tidak bisa tulis rides | |

## Catatan Penulisan Bab VI
- Lampirkan screenshot tiap skenario penting
- Tabel Pass/Fail di atas bisa jadi lampiran
- Untuk algoritma: bandingkan dengan kompetitor (opsional, data sekunder)
- Sebut keterbatasan MVP (belum GPS realtime, belum payment gateway, dll)
