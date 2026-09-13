/**
 * TRBike — Driver Module
 */

async function getDriverProfile(uid) {
  const snap = await db.ref("drivers/" + uid).once("value");
  return snap.exists() ? snap.val() : null;
}

async function setDriverOnline(uid, isOnline) {
  await db.ref("drivers/" + uid + "/isOnline").set(!!isOnline);
}

async function getRequestedRides(limit = 20) {
  const snap = await db.ref("rides")
    .orderByChild("status")
    .equalTo("requested")
    .limitToLast(limit)
    .once("value");

  const rides = [];
  snap.forEach(child => {
    rides.push({ id: child.key, ...child.val() });
  });
  rides.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return rides;
}

function listenRequestedRides(callback) {
  const ref = db.ref("rides").orderByChild("status").equalTo("requested");
  ref.on("value", snap => {
    const rides = [];
    snap.forEach(child => {
      rides.push({ id: child.key, ...child.val() });
    });
    rides.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(rides);
  });
  return () => ref.off();
}

/**
 * Dengarkan order aktif milik driver (accepted / in_trip)
 */
function listenDriverActiveRides(driverId, callback) {
  const ref = db.ref("rides").orderByChild("driverId").equalTo(driverId);
  ref.on("value", snap => {
    const rides = [];
    snap.forEach(child => {
      const r = child.val();
      if (r.status === "accepted" || r.status === "in_trip") {
        rides.push({ id: child.key, ...r });
      }
    });
    rides.sort((a, b) => (b.acceptedAt || 0) - (a.acceptedAt || 0));
    callback(rides);
  });
  return () => ref.off();
}

async function acceptRide(rideId, driverId) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");

  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();

  if (ride.status !== "requested") {
    throw new Error("Order sudah diambil atau dibatalkan");
  }

  await rideRef.update({
    driverId: driverId,
    status: "accepted",
    acceptedAt: Date.now()
  });

  return true;
}

/**
 * Selesaikan perjalanan → update status + tambah hak driver ke wallet
 */
async function completeRide(rideId, driverId) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");

  const ride = snap.val();
  if (ride.driverId !== driverId) throw new Error("Bukan order Anda");
  if (ride.status !== "accepted" && ride.status !== "in_trip") {
    throw new Error("Status order tidak valid untuk diselesaikan");
  }

  const driverGross = ride.fare?.driverGross || 0;

  await rideRef.update({
    status: "completed",
    completedAt: Date.now()
  });

  // Tambah hak driver ke wallet
  const driverRef = db.ref("drivers/" + driverId);
  const dSnap = await driverRef.once("value");
  const current = dSnap.val() || {};
  const newBalance = (current.walletBalance || 0) + driverGross;
  const newEarnings = (current.totalEarnings || 0) + driverGross;
  const newRides = (current.totalRides || 0) + 1;

  await driverRef.update({
    walletBalance: newBalance,
    totalEarnings: newEarnings,
    totalRides: newRides
  });

  return { driverGross, newBalance };
}

function listenDriverFeedback(driverId, callback) {
  const ref = db.ref("drivers/" + driverId + "/feedback").limitToLast(10);
  ref.on("value", (snap) => {
    const items = [];
    snap.forEach((c) => items.push({ id: c.key, ...c.val() }));
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(items);
  });
  return () => ref.off();
}

async function updateDriverPrefs(uid, prefs) {
  await db.ref("drivers/" + uid + "/prefs").update(prefs);
}
