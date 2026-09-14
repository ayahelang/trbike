/**
 * TRBike — Authentication Module
 */

/** Promise lock agar onAuthStateChanged menunggu profil selesai ditulis saat register */
let authBootstrapLock = null;

async function ensureUserProfile(user, extra = {}) {
  const uid = user.uid;
  const snap = await db.ref("users/" + uid).once("value");
  const now = Date.now();
  const requestedRole = extra.role || "passenger";

  if (snap.exists()) {
    const existing = snap.val() || {};
    const updates = { updatedAt: now };

    // Force role saat register baru / upgrade eksplisit ke driver
    if (extra.forceRole && requestedRole) {
      updates.role = requestedRole;
    }
    if (extra.fullName && String(extra.fullName).trim().length >= 2) {
      updates.fullName = String(extra.fullName).trim();
    }
    if (extra.gender) updates.gender = extra.gender;

    // Pastikan node drivers ada jika role driver
    const finalRole = updates.role || existing.role || "passenger";
    if (finalRole === "driver") {
      const dSnap = await db.ref("drivers/" + uid).once("value");
      if (!dSnap.exists()) {
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
    }

    if (Object.keys(updates).length > 1 || updates.role) {
      await db.ref("users/" + uid).update(updates);
    }
    const fresh = await db.ref("users/" + uid).once("value");
    return { uid, ...fresh.val() };
  }

  const role = requestedRole || "passenger";
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
    verificationStatus: "none",
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
  const chosenRole = role === "driver" ? "driver" : "passenger";
  authBootstrapLock = (async () => {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    // Tulis profil SEBELUM renderApp dari onAuthStateChanged
    await ensureUserProfile(cred.user, {
      fullName,
      role: chosenRole,
      gender: gender || "",
      provider: "email",
      forceRole: true
    });
    return cred.user;
  })();
  try {
    return await authBootstrapLock;
  } finally {
    // beri sedikit waktu listener yang sudah menunggu
    setTimeout(() => {
      authBootstrapLock = null;
    }, 0);
  }
}

async function loginUser(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

async function loginWithGoogle(role = "passenger") {
  const chosenRole = role === "driver" ? "driver" : "passenger";
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  authBootstrapLock = (async () => {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const snap = await db.ref("users/" + user.uid).once("value");
    if (!snap.exists()) {
      await ensureUserProfile(user, {
        role: chosenRole,
        provider: "google",
        forceRole: true
      });
    } else if (chosenRole === "driver" && snap.val().role !== "driver") {
      // Upgrade ke driver jika user pilih driver di form Google
      await ensureUserProfile(user, {
        role: "driver",
        provider: "google",
        forceRole: true
      });
    }
    return user;
  })();
  try {
    return await authBootstrapLock;
  } finally {
    setTimeout(() => {
      authBootstrapLock = null;
    }, 0);
  }
}

async function logoutUser() {
  await auth.signOut();
}

async function getCurrentUserProfile() {
  // Tunggu register/login Google selesai menulis role yang benar
  if (authBootstrapLock) {
    try {
      await authBootstrapLock;
    } catch (_) {}
  }
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await db.ref("users/" + user.uid).once("value");
  if (!snap.exists()) {
    // Jangan default passenger di sini jika sedang bootstrap
    if (authBootstrapLock) {
      try {
        await authBootstrapLock;
      } catch (_) {}
      const again = await db.ref("users/" + user.uid).once("value");
      if (again.exists()) return { uid: user.uid, ...again.val() };
    }
    // Fallback terakhir — tanpa force role passenger agresif jika extra tidak ada
    return await ensureUserProfile(user, { role: "passenger", provider: "google" });
  }
  return { uid: user.uid, ...snap.val() };
}

async function updateUserProfile(uid, patch) {
  await db.ref("users/" + uid).update({ ...patch, updatedAt: Date.now() });
  // Jika ganti role ke driver, pastikan node drivers
  if (patch.role === "driver") {
    const dSnap = await db.ref("drivers/" + uid).once("value");
    if (!dSnap.exists()) {
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
        createdAt: Date.now()
      });
    }
  }
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
  // MVP: auto-approve untuk demo skripsi
  await db.ref("users/" + uid).update({
    identityVerified: true,
    verificationStatus: "approved",
    verifiedAt: Date.now()
  });
}

function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(async (user) => {
    if (authBootstrapLock) {
      try {
        await authBootstrapLock;
      } catch (_) {}
    }
    return callback(user);
  });
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

/** Upgrade / ganti peran ke driver */
async function switchToDriverRole(uid) {
  await updateUserProfile(uid, { role: "driver" });
}
