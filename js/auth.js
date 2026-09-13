/**
 * TRBike — Authentication Module
 */

async function registerUser(fullName, email, password, role) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const uid = cred.user.uid;
  const now = Date.now();

  const userData = {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    role: role,
    identityVerified: false,
    createdAt: now,
    updatedAt: now
  };

  await db.ref("users/" + uid).set(userData);

  // Jika driver, buat record drivers
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

  return cred.user;
}

async function loginUser(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

async function logoutUser() {
  await auth.signOut();
}

async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;

  const snap = await db.ref("users/" + user.uid).once("value");
  if (!snap.exists()) return null;

  return { uid: user.uid, ...snap.val() };
}

function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}
