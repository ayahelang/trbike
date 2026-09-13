/**
 * TRBike — Fare Engine v2.1
 *
 * BBM = Rp 350 / km (trip + jemput)
 * Dari total BBM (alokasi hak driver):
 *   10% perawatan | 13% makan & kesehatan | 77% jasa driver
 *
 * Tarif sebelum PPN =
 *   BBM + Perawatan + Makan&kesehatan + Jasa driver + Biaya layanan
 * (karena 10+13+77% = 100% BBM, ini setara 2×BBM + biaya layanan)
 *
 * Biaya layanan = 17% × total BBM (hak TRBike)
 * PPN = 11% × tarif sebelum PPN
 * Total penumpang = sebelum PPN + PPN (bulat Rp500)
 */

const DEFAULT_FARE_RULES = {
  fuelPerKm: 350,
  perawatanPercent: 0.1,
  makanKesehatanPercent: 0.13,
  jasaDriverPercent: 0.77,
  serviceFeePercent: 0.17,
  taxPercent: 0.11,
  classMultipliers: {
    standard: 1.0,
    comfort: 1.1,
    premium: 1.2
  },
  version: "2.1.0-beforePpn-full"
};

function calculateFare(tripKm, pickupKm, serviceClass = "standard", rules = DEFAULT_FARE_RULES) {
  const trip = Math.max(0, Number(tripKm) || 0);
  const pickup = Math.max(0, Number(pickupKm) || 0);
  const mult = rules.classMultipliers[serviceClass] || 1;
  const fuelPerKm = rules.fuelPerKm || 350;

  const tripFuel = trip * fuelPerKm;
  const pickupFuel = pickup * fuelPerKm;
  const totalBBM = (tripFuel + pickupFuel) * mult;

  const perawatan = totalBBM * (rules.perawatanPercent ?? 0.1);
  const makanKesehatan = totalBBM * (rules.makanKesehatanPercent ?? 0.13);
  const jasaDriver = totalBBM * (rules.jasaDriverPercent ?? 0.77);
  // Pendapatan bersih driver = alokasi dari BBM (100%)
  const pendapatanBersih = perawatan + makanKesehatan + jasaDriver;

  const serviceFee = totalBBM * (rules.serviceFeePercent ?? 0.17);

  // SEBELUM PPN = BBM + Perawatan + Makan&kes + Jasa + Layanan
  const beforePpn =
    totalBBM + perawatan + makanKesehatan + jasaDriver + serviceFee;

  const tax = beforePpn * (rules.taxPercent ?? 0.11);
  const rawTotal = beforePpn + tax;
  const total = Math.ceil(rawTotal / 500) * 500;

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
    driverPool: round(pendapatanBersih),
    driverGross: round(pendapatanBersih),
    classMultiplier: mult,
    serviceClass,
    tripKm: trip,
    pickupKm: pickup,
    fuelPerKm,
    rulesVersion: rules.version,
    breakdown: {
      tripFuel: round(tripFuel * mult),
      pickupFuel: round(pickupFuel * mult),
      totalBBM: round(totalBBM),
      perawatan: round(perawatan),
      makanKesehatan: round(makanKesehatan),
      jasaDriver: round(jasaDriver),
      pendapatanBersih: round(pendapatanBersih),
      serviceFee: round(serviceFee),
      beforePpn: round(beforePpn),
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
    if (snap.exists()) {
      return { ...DEFAULT_FARE_RULES, ...snap.val() };
    }
  } catch (e) {
    console.warn("fareRules fallback", e.message);
  }
  return DEFAULT_FARE_RULES;
}
