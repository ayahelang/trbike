/**
 * TRBike — Firebase Configuration
 *
 * PENTING:
 * - Jangan commit service_role / private key
 * - databaseURL harus diambil dari Firebase Console → Realtime Database
 */

const firebaseConfig = {
  apiKey: "AIzaSyDywY8Q9lrU3nZdtvIZBRsjTO_xN6W2qFY",
  authDomain: "trbike.firebaseapp.com",
  // Ganti jika di console berbeda. Cek: Realtime Database → tab Data (URL bar)
  databaseURL: "https://trbike-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trbike",
  storageBucket: "trbike.firebasestorage.app",
  messagingSenderId: "1049681707234",
  appId: "1:1049681707234:web:1c1d98ca8be09615a01ebb"
};

let app, auth, db;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.error("Firebase SDK belum dimuat.");
    return false;
  }
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.database();
  return true;
}
