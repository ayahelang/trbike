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
    prefs: data.prefs || { verifiedOnly: true, sameGenderOnly: false },
    fare: {
      total: fareResult.total,
      tripFuel: fareResult.tripFuel,
      pickupFuel: fareResult.pickupFuel,
      totalBBM: fareResult.totalBBM,
      perawatan: fareResult.perawatan,
      makanKesehatan: fareResult.makanKesehatan,
      jasaDriver: fareResult.jasaDriver,
      driverPool: fareResult.driverPool,
      serviceFee: fareResult.serviceFee,
      tax: fareResult.tax,
      beforePpn: fareResult.beforePpn,
      driverGross: fareResult.driverGross,
      payToPlatform: fareResult.payToPlatform,
      payToDriver: fareResult.payToDriver,
      fuelPerKm: fareResult.fuelPerKm,
      offPeak: fareResult.offPeak,
      breakdown: fareResult.breakdown,
      rulesVersion: fareResult.rulesVersion
    },
    paymentMethod: data.paymentMethod || "cash",
    preferredDriverId: data.preferredDriverId || null,
    serviceFeePaid: !!data.serviceFeePaid,
    paymentProofUrl: data.paymentProofUrl || null,
    tip: 0,
    rating: null,
    cancelCharge: null,
    createdAt: now,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null
  };

  await rideRef.set(rideData);
  return rideId;
}

async function cancelRide(rideId, passengerId, options = {}) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();
  if (ride.passengerId !== passengerId) throw new Error("Bukan order Anda");
  if (ride.status === "completed" || ride.status === "cancelled") {
    throw new Error("Order sudah selesai/dibatalkan");
  }

  let cancelCharge = null;
  // Jika driver sudah accept → charge 2× BBM jarak jemput yang sudah diestimasi
  if (ride.status === "accepted" || ride.status === "in_trip" || ride.status === "driver_arriving") {
    const rules = typeof getFareRules === "function" ? await getFareRules() : null;
    const fuelPerKm = (typeof getFuelPerKm === 'function' ? getFuelPerKm(rules || {}) : (rules?.fuelPerKmPeak || 700));
    // Jarak tempuh jemput: pakai pickupDistanceKm (MVP); produksi = GPS aktual
    const traveled = Number(options.traveledKm != null ? options.traveledKm : ride.pickupDistanceKm) || 0;
    const charge = Math.ceil((traveled * fuelPerKm * 2) / 500) * 500;
    cancelCharge = {
      traveledKm: traveled,
      fuelPerKm: Math.round(fuelPerKm),
      multiplier: 2,
      amount: charge,
      reason: "Kompensasi BBM driver (2× jarak jemput yang ditempuh)"
    };

    // Tambah ke wallet driver
    if (ride.driverId && charge > 0) {
      const dRef = db.ref("drivers/" + ride.driverId);
      const dSnap = await dRef.once("value");
      const d = dSnap.val() || {};
      await dRef.update({
        walletBalance: (d.walletBalance || 0) + charge,
        totalEarnings: (d.totalEarnings || 0) + charge
      });
      // Notifikasi sederhana di node driver
      await db.ref("drivers/" + ride.driverId + "/notifications").push({
        type: "cancel_compensation",
        rideId,
        amount: charge,
        message: `Penumpang membatalkan. Kompensasi BBM Rp${charge}`,
        createdAt: Date.now()
      });
    }
  }

  await rideRef.update({
    status: "cancelled",
    cancelledAt: Date.now(),
    cancelCharge: cancelCharge,
    cancelBy: "passenger"
  });

  return { cancelCharge };
}

async function deleteRide(rideId, passengerId) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();
  if (ride.passengerId !== passengerId) throw new Error("Bukan order Anda");
  if (ride.status === "accepted" || ride.status === "in_trip") {
    throw new Error("Order sedang berjalan, batalkan dulu atau tunggu selesai");
  }
  await rideRef.remove();
  return true;
}

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
    cancelCharge: null,
    reorderedAt: Date.now()
  });
  return true;
}

/** Tips + rating → ke ride & akun driver */
async function submitTipAndRating(rideId, passengerId, { stars, tip, comment }) {
  const rideRef = db.ref("rides/" + rideId);
  const snap = await rideRef.once("value");
  if (!snap.exists()) throw new Error("Order tidak ditemukan");
  const ride = snap.val();
  if (ride.passengerId !== passengerId) throw new Error("Bukan order Anda");

  const tipAmount = Math.max(0, Math.round(Number(tip) || 0));
  const rating = stars ? Math.min(5, Math.max(1, Number(stars))) : null;

  await rideRef.update({
    tip: tipAmount,
    rating,
    ratingComment: comment || "",
    ratedAt: Date.now()
  });

  if (ride.driverId) {
    const dRef = db.ref("drivers/" + ride.driverId);
    const dSnap = await dRef.once("value");
    const d = dSnap.val() || {};
    const updates = {};
    if (tipAmount > 0) {
      updates.walletBalance = (d.walletBalance || 0) + tipAmount;
      updates.totalEarnings = (d.totalEarnings || 0) + tipAmount;
    }
    // Simple running average rating
    if (rating) {
      const count = (d.ratingCount || 0) + 1;
      const prev = d.rating || 5;
      updates.rating = Math.round(((prev * (count - 1) + rating) / count) * 10) / 10;
      updates.ratingCount = count;
    }
    if (Object.keys(updates).length) await dRef.update(updates);

    await db.ref("drivers/" + ride.driverId + "/feedback").push({
      rideId,
      passengerId,
      stars: rating,
      tip: tipAmount,
      comment: comment || "",
      createdAt: Date.now()
    });
  }

  return { tipAmount, rating };
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
