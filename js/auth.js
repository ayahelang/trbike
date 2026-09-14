/**
 * TRBike — Authentication Module
 */

async function ensureUserProfile(user, extra = {}) {
  const uid = user.uid;
  const snap = await db.ref("users/" + uid).once("value");
  if (snap.exists()) {
    return { uid, ...snap.val() };
  }

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
    gender: extra.gender || "",
    identityVerified: false,
    verificationStatus: "none", // none | pending | approved | rejected
    prefs: {
      verifiedDriversOnly: true,
      sameGenderOnly: false
    },
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
      ratingCount: 0,
      prefs: {
        verifiedPassengersOnly: false,
        womenPassengersOnly: false
      },
      createdAt: now
    });
  }

  return { uid, ...userData };
}

async function registerUser(fullName, email, password, role, gender) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await ensureUserProfile(cred.user, {
    fullName,
    role,
    gender: gender || "",
    provider: "email"
  });
  return cred.user;
}

async function loginUser(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

async function loginWithGoogle(role = "passenger") {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await auth.signInWithPopup(provider);
  const user = result.user;
  const snap = await db.ref("users/" + user.uid).once("value");
  if (!snap.exists()) {
    await ensureUserProfile(user, { role: role || "passenger", provider: "google" });
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
    return await ensureUserProfile(user, { role: "passenger", provider: "google" });
  }
  return { uid: user.uid, ...snap.val() };
}

async function updateUserProfile(uid, patch) {
  await db.ref("users/" + uid).update({ ...patch, updatedAt: Date.now() });
}

/** Upload KYC images to Storage (fallback: skip if storage null) */
async function uploadKycImage(uid, file, kind) {
  if (!storage || !file) return null;
  const path = `kyc/${uid}/${kind}_${Date.now()}`;
  const ref = storage.ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}

async function submitKyc(uid, { selfieUrl, ktpUrl }) {
  await db.ref("users/" + uid).update({
    verificationStatus: "pending",
    kyc: {
      selfieUrl: selfieUrl || null,
      ktpUrl: ktpUrl || null,
      submittedAt: Date.now()
    },
    updatedAt: Date.now()
  });
  // MVP: auto-approve untuk demo skripsi (bisa diganti admin manual)
  await db.ref("users/" + uid).update({
    identityVerified: true,
    verificationStatus: "approved",
    verifiedAt: Date.now()
  });
}

function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}


/** Hapus data akun sendiri + coba hapus Auth user */
async function deleteMyAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("Belum login");
  const uid = user.uid;
  try {
    await db.ref("presence/" + uid).remove();
  } catch (_) {}
  try {
    await db.ref("drivers/" + uid).remove();
  } catch (_) {}
  try {
    await db.ref("users/" + uid).remove();
  } catch (e) {
    console.warn(e);
  }
  try {
    await user.delete();
  } catch (e) {
    // Butuh login ulang baru-baru ini
    const code = e.code || "";
    if (code.includes("requires-recent-login")) {
      await auth.signOut();
      throw new Error(
        "Data profil dihapus. Login ulang lalu hapus lagi untuk menghapus akun Auth, atau hubungi admin."
      );
    }
    await auth.signOut();
    throw e;
  }
}
