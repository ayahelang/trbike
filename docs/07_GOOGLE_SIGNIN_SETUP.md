# Setup Google Sign-In (Firebase)

## 1. Aktifkan provider Google

1. Buka: https://console.firebase.google.com/project/_/authentication/providers
2. Klik **Google**
3. Enable → pilih **Project support email** → **Save**

## 2. Authorized domains

Pastikan domain berikut ada di **Authentication → Settings → Authorized domains**:

- `localhost`
- `ayahelang.github.io`

## 3. (Opsional) OAuth consent screen

Jika Google meminta konfigurasi consent screen di Google Cloud Console:

1. Buka Google Cloud Console → APIs & Services → OAuth consent screen
2. User type: External (untuk testing)
3. Isi App name: TRBike
4. Support email: email kamu
5. Save and continue sampai selesai

Untuk development biasanya Firebase sudah mengurus sebagian besar.

## 4. Cara kerja di TRBike

- Tombol **Lanjutkan dengan Google** memakai `signInWithPopup`
- Jika akun **baru**, role diambil dari dropdown “Daftar/Masuk Google sebagai”
- Jika akun **sudah ada**, role yang tersimpan di database dipakai (dropdown diabaikan)

## 5. Testing

1. Buka https://ayahelang.github.io/trbike
2. Pilih role (Penumpang / Driver)
3. Klik **Lanjutkan dengan Google**
4. Pilih akun Google
5. Harus masuk ke dashboard sesuai role
