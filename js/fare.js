/**
 * TRBike Fare v2.2
 * BBM peak/default: Rp 700/km (pp + balik)
 * BBM off-peak: Rp 550/km (08–11 & 13–16)
 * Detail rumus internal — jangan diekspos panjang di UI penumpang
 */

const DEFAULT_FARE_RULES = {
  fuelPerKmPeak: 700,
  fuelPerKmOffPeak: 550,
  perawatanPercent: 0.1,
  makanKesehatanPercent: 0.13,
  jasaDriverPercent: 0.77,
  serviceFeePercent: 0.17,
  taxPercent: 0.11,
  classMultipliers: { standard: 1, comfort: 1.1, premium: 1.2 },
  version: "2.2.0-bbm700-offpeak550"
};

/** Off-peak: 08:00–11:00 dan 13:00–16:00 (waktu lokal) */
function isOffPeakHour(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  const t = h + m / 60;
  return (t >= 8 && t < 11) || (t >= 13 && t < 16);
}

function getFuelPerKm(rules = DEFAULT_FARE_RULES, date = new Date()) {
  return isOffPeakHour(date)
    ? rules.fuelPerKmOffPeak || 550
    : rules.fuelPerKmPeak || 700;
}

function calculateFare(tripKm, pickupKm, serviceClass = "standard", rules = DEFAULT_FARE_RULES, at = new Date()) {
  const trip = Math.max(0, Number(tripKm) || 0);
  const pickup = Math.max(0, Number(pickupKm) || 0);
  const mult = rules.classMultipliers[serviceClass] || 1;
  const fuelPerKm = getFuelPerKm(rules, at);
  const offPeak = isOffPeakHour(at);

  const tripFuel = trip * fuelPerKm;
  const pickupFuel = pickup * fuelPerKm;
  const totalBBM = (tripFuel + pickupFuel) * mult;

  const perawatan = totalBBM * (rules.perawatanPercent ?? 0.1);
  const makanKesehatan = totalBBM * (rules.makanKesehatanPercent ?? 0.13);
  const jasaDriver = totalBBM * (rules.jasaDriverPercent ?? 0.77);
  const pendapatanBersih = perawatan + makanKesehatan + jasaDriver;

  const serviceFee = totalBBM * (rules.serviceFeePercent ?? 0.17);
  const beforePpn = totalBBM + perawatan + makanKesehatan + jasaDriver + serviceFee;
  const tax = beforePpn * (rules.taxPercent ?? 0.11);
  const total = Math.ceil((beforePpn + tax) / 500) * 500;
  const round = (n) => Math.round(n);

  return {
    total: round(total),
    tripFuel: round(tripFuel * mult),
    pickupFuel: round(pickupFuel * mult),
    totalBBM: round(totalBBM),
    perawatan: round(perawatan),
    makanKesehatan: round(makanKesehatan),
    jasaDriver: round(jasaDriver),
    pendapatanBersih: round(pendapatanBersih),
    serviceFee: round(serviceFee),
    tax: round(tax),
    beforePpn: round(beforePpn),
    driverGross: round(pendapatanBersih),
    driverPool: round(pendapatanBersih),
    fuelPerKm,
    offPeak,
    classMultiplier: mult,
    serviceClass,
    tripKm: trip,
    pickupKm: pickup,
    rulesVersion: rules.version,
    breakdown: {
      tripFuel: round(tripFuel * mult),
      pickupFuel: round(pickupFuel * mult),
      serviceFee: round(serviceFee),
      tax: round(tax),
      total: round(total)
    }
  };
}

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(n || 0);
}

async function getFareRules() {
  try {
    const snap = await db.ref("fareRules/current").once("value");
    if (snap.exists()) return { ...DEFAULT_FARE_RULES, ...snap.val() };
  } catch (e) {
    console.warn(e.message);
  }
  return DEFAULT_FARE_RULES;
}
