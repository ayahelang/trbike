# TRBike — Firebase Realtime Database Security Rules

## Prinsip
- Hanya user yang sudah login yang bisa membaca/menulis data miliknya.
- Driver hanya bisa update status online & menerima order.
- Penumpang hanya bisa membuat order atas nama sendiri.
- Fare rules hanya bisa dibaca (write hanya admin — di MVP kita buat read-only).

## Rules yang Direkomendasikan

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid",
        ".validate": "newData.hasChildren(['fullName', 'email', 'role', 'createdAt'])"
      }
    },

    "drivers": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid",
        "isOnline": {
          ".validate": "newData.isBoolean()"
        },
        "walletBalance": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        }
      }
    },

    "rides": {
      ".read": "auth != null",
      "$rideId": {
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['passengerId', 'status', 'createdAt'])",
        "passengerId": {
          ".validate": "newData.val() == auth.uid || data.val() == auth.uid"
        },
        "status": {
          ".validate": "newData.isString() && (newData.val() == 'requested' || newData.val() == 'accepted' || newData.val() == 'driver_arriving' || newData.val() == 'in_trip' || newData.val() == 'completed' || newData.val() == 'cancelled')"
        }
      }
    },

    "fareRules": {
      ".read": true,
      ".write": false
    },

    "system": {
      ".read": true,
      ".write": false
    }
  }
}
```

## Catatan Keamanan MVP
- Rules di atas sudah cukup ketat untuk prototipe.
- Di produksi nanti tambahkan:
  - Validasi role sebelum write ke `drivers`
  - Cloud Functions untuk update wallet & status order
  - Rate limiting
  - Audit log

## Cara Memasang Rules
1. Buka Firebase Console → Realtime Database → Rules
2. Paste rules di atas
3. Publish
