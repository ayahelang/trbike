# TRBike — Firebase Realtime Database Schema

## Struktur Utama

```
trbike/
├── users/
│   └── {uid}/
│       ├── fullName: string
│       ├── email: string
│       ├── role: "passenger" | "driver"
│       ├── phone: string (optional)
│       ├── identityVerified: boolean
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── drivers/
│   └── {uid}/
│       ├── isOnline: boolean
│       ├── walletBalance: number
│       ├── totalEarnings: number
│       ├── totalRides: number
│       ├── rating: number
│       ├── vehicle/
│       │   ├── type: string
│       │   ├── plate: string
│       │   └── photoUrl: string (optional)
│       ├── batteryLevel: number (optional)
│       └── lastLocation/ (fase lanjut)
│           ├── lat: number
│           ├── lng: number
│           └── updatedAt: timestamp
│
├── rides/
│   └── {rideId}/
│       ├── passengerId: string
│       ├── driverId: string | null
│       ├── status: "requested" | "accepted" | "driver_arriving" | "in_trip" | "completed" | "cancelled"
│       ├── pickupText: string
│       ├── destinationText: string (optional)
│       ├── pickupDistanceKm: number
│       ├── tripDistanceKm: number
│       ├── serviceClass: "standard" | "comfort" | "premium"
│       ├── fare/
│       │   ├── total: number
│       │   ├── tripFuel: number
│       │   ├── pickupFuel: number
│       │   ├── driverPool: number
│       │   ├── serviceFee: number
│       │   ├── tax: number
│       │   ├── driverGross: number
│       │   └── breakdown: object
│       ├── createdAt: timestamp
│       ├── acceptedAt: timestamp | null
│       ├── completedAt: timestamp | null
│       └── cancelledAt: timestamp | null
│
├── fareRules/
│   └── current/
│       ├── fuelPricePerLiter: number
│       ├── fuelEfficiencyKmPerLiter: number
│       ├── baseFare: number
│       ├── serviceFeePercent: number
│       ├── taxPercent: number
│       ├── pools/
│       │   ├── maintenance: number
│       │   ├── labor: number
│       │   ├── health: number
│       │   ├── oldAge: number
│       │   ├── charity: number
│       │   └── food: number
│       ├── classMultipliers/
│       │   ├── standard: 1
│       │   ├── comfort: 1.1
│       │   └── premium: 1.2
│       └── version: string
│
└── system/
    └── config/
        ├── appName: "TRBike"
        ├── motto: "Terbaik untuk Driver dan Penumpang"
        └── minAppVersion: string
```

## Penjelasan Penting

### users/{uid}
Profil dasar semua pengguna. Role menentukan tampilan UI.

### drivers/{uid}
Hanya ada jika role = "driver".  
`walletBalance` = hak driver (bukan gaji TRBike).

### rides/{rideId}
Setiap order disimpan di sini. Status berubah secara realtime.  
Fare breakdown disimpan agar audit trail jelas (penting untuk skripsi).

### fareRules/current
Parameter tarif bisa diubah tanpa mengubah kode (fleksibel untuk riset).

## Naming Convention
- camelCase untuk key
- Timestamp disimpan sebagai `firebase.database.ServerValue.TIMESTAMP` atau ISO string
- Semua nominal dalam Rupiah (number, tanpa desimal)

## Indeks & Query
Firebase Realtime Database mendukung query terbatas.  
Untuk MVP:
- Ambil rides berdasarkan `passengerId` atau `status == "requested"`
- Gunakan `orderByChild` + `equalTo`
