/**
 * TRBike — Authentication Module
 * Email/Password + Google Sign-In
 */

async function ensureUserProfile(user, extra = {}) {
  const uid = user.uid;
  const snap = await db.ref("users/" + uid).once("value");

  if (snap.exists()) {
    return { uid, ...snap.val() };
  }

  // User baru (biasanya dari Google) — buat profil
  const now = Date.now();
  const role = extra.role || "passenger";
  const fullName =
    extra.fullName ||
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "Pengguna");

  const userData = {
    fullName: String(fullName).trim(),
    email: (user.email || "").toLowerCase(),
    role,
    identityVerified: false,
    provider: extra.provider || "email",
    createdAt: now,
    updatedAt: now
  };

  await db.ref("users/" + uid).set(userData);

  if (role === "driver") {
    await db.ref("drivers/" + uid).set({
      isOnline: false,
      walletBalance: 0,
      totalEarnings: 0,
      totalRides: 0,
      rating: 5.0,
      createdAt: now
    });
  }

  return { uid, ...userData };
}

async function registerUser(fullName, email, password, role) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await ensureUserProfile(cred.user, {
    fullName,
    role,
    provider: "email"
  });
  return cred.user;
}

async function loginUser(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

/**
 * Login / Daftar dengan Google
 * @param {string} role - dipakai hanya jika akun baru (passenger | driver)
 */
async function loginWithGoogle(role = "passenger") {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await auth.signInWithPopup(provider);
  const user = result.user;

  // Cek apakah sudah punya profil
  const snap = await db.ref("users/" + user.uid).once("value");
  if (!snap.exists()) {
    await ensureUserProfile(user, {
      role: role || "passenger",
      provider: "google"
    });
  }

  return user;
}

async function logoutUser() {
  await auth.signOut();
}

async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;

  const snap = await db.ref("users/" + user.uid).once("value");
  if (!snap.exists()) {
    // Edge case: auth ada tapi profil belum — buat default passenger
    return await ensureUserProfile(user, { role: "passenger", provider: "google" });
  }

  return { uid: user.uid, ...snap.val() };
}

function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}
