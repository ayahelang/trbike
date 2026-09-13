/**
 * TRBike — Passenger Module
 */

async function createRide(passengerId, data, fareResult) {
  const rideRef = db.ref("rides").push();
  const rideId = rideRef.key;
  const now = Date.now();

  const rideData = {
    passengerId,
    driverId: null,
    status: "requested",
    pickupText: data.pickupText || "Lokasi penjemputan",
    destinationText: data.destinationText || "",
    note: data.note || "",
    pickupDistanceKm: Number(data.pickupKm) || 0,
    tripDistanceKm: Number(data.tripKm) || 0,
    serviceClass: data.serviceClass || "standard",
    pickupLat: data.pickupLat || null,
    pickupLng: data.pickupLng || null,
    destLat: data.destLat || null,
    destLng: data.destLng || null,
    etaMinutes: data.etaMinutes || null,
    fare: {
      total: fareResult.total,
      tripFuel: fareResult.tripFuel,
      pickupFuel: fareResult.pickupFuel,
      driverPool: fareResult.driverPool,
      serviceFee: fareResult.serviceFee,
      tax: fareResult.tax,
      driverGross: fareResult.driverGross,
      breakdown: fareResult.breakdown,
      rulesVersion: fareResult.rulesVersion
    },
    createdAt: now,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null
  };

  await rideRef.set(rideData);
  return rideId;
}

async function cancelRide(rideId, passengerId) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();
  if (ride.passengerId !== passengerId) throw new Error("Bukan order Anda");
  if (ride.status !== "requested") {
    throw new Error("Order sudah tidak bisa dibatalkan (status: " + ride.status + ")");
  }
  await rideRef.update({ status: "cancelled", cancelledAt: Date.now() });
  return true;
}

/** Hapus order permanen (hanya milik sendiri) */
async function deleteRide(rideId, passengerId) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();
  if (ride.passengerId !== passengerId) throw new Error("Bukan order Anda");
  // Boleh hapus requested / cancelled / completed; jangan hapus accepted aktif
  if (ride.status === "accepted" || ride.status === "in_trip") {
    throw new Error("Order sedang berjalan, tidak bisa dihapus");
  }
  await rideRef.remove();
  return true;
}

/** Update catatan / lokasi / status reorder */
async function updateRide(rideId, passengerId, patch) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();
  if (ride.passengerId !== passengerId) throw new Error("Bukan order Anda");
  await rideRef.update({ ...patch, updatedAt: Date.now() });
  return true;
}

async function reorderRide(rideId, passengerId) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();
  if (ride.passengerId !== passengerId) throw new Error("Bukan order Anda");
  await rideRef.update({
    status: "requested",
    driverId: null,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
    reorderedAt: Date.now()
  });
  return true;
}

function listenPassengerRides(passengerId, callback) {
  const ref = db.ref("rides").orderByChild("passengerId").equalTo(passengerId);
  ref.on("value", (snap) => {
    const rides = [];
    snap.forEach((child) => {
      rides.push({ id: child.key, ...child.val() });
    });
    rides.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(rides);
  });
  return () => ref.off();
}
