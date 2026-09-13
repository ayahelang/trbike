/**
 * TRBike — Firebase Configuration
 * 
 * Ganti nilai di bawah dengan config dari Firebase Console
 * (Project Settings → Your apps → Web app)
 * 
 * PENTING: Jangan pernah commit service account / private key.
 * Hanya gunakan config client-side (apiKey, authDomain, dll).
 */

const firebaseConfig = {
  apiKey: "AIzaSyDywY8Q9lrU3nZdtvIZBRsjTO_xN6W2qFY",
  authDomain: "trbike.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trbike",
  storageBucket: "trbike.firebasestorage.app",
  messagingSenderId: "1049681707234",
  appId: "1:1049681707234:web:1c1d98ca8be09615a01ebb"
};

// Inisialisasi Firebase (akan di-load dari CDN di index.html)
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
