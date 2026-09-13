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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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
