/**
 * TRBike — Fair Fare Engine (revisi sesuai ketentuan bisnis)
 *
 * BBM = Rp 350 / km (trip + jemput) → dasar hak driver
 * Dari total BBM:
 *   - 10% tabungan perawatan kendaraan (hak driver)
 *   - 13% tabungan makan + kesehatan (hak driver)
 *   - 77% jasa driver (hak driver)
 *   (10+13+77 = 100% total BBM = pendapatan bersih driver)
 *
 * Biaya layanan = % dari total BBM → hak TRBike (default 17%)
 * Tarif sebelum PPN = total BBM + biaya layanan
 * PPN = 11% × tarif sebelum PPN
 * Total dibayar penumpang = tarif sebelum PPN + PPN (dibulatkan ke Rp500)
 */

const DEFAULT_FARE_RULES = {
  fuelPerKm: 350, // Rp per km
  // Pembagian dari total BBM (hak driver)
  perawatanPercent: 0.10,
  makanKesehatanPercent: 0.13,
  jasaDriverPercent: 0.77,
  // Hak platform
  serviceFeePercent: 0.17, // dari total BBM
  taxPercent: 0.11, // PPN dari tarif sebelum PPN
  classMultipliers: {
    standard: 1.0,
    comfort: 1.1,
    premium: 1.2
  },
  version: "2.0.0-bbm350"
};

function calculateFare(tripKm, pickupKm, serviceClass = "standard", rules = DEFAULT_FARE_RULES) {
  const trip = Math.max(0, Number(tripKm) || 0);
  const pickup = Math.max(0, Number(pickupKm) || 0);
  const mult = rules.classMultipliers[serviceClass] || 1;

  const fuelPerKm = rules.fuelPerKm || 350;
  const tripFuel = trip * fuelPerKm;
  const pickupFuel = pickup * fuelPerKm;
  const totalBBM = tripFuel + pickupFuel;

  // Hak driver (100% dari total BBM)
  const perawatan = totalBBM * (rules.perawatanPercent ?? 0.1);
  const makanKesehatan = totalBBM * (rules.makanKesehatanPercent ?? 0.13);
  const jasaDriver = totalBBM * (rules.jasaDriverPercent ?? 0.77);
  const pendapatanBersih = perawatan + makanKesehatan + jasaDriver; // = totalBBM

  // Hak TRBike
  const serviceFee = totalBBM * (rules.serviceFeePercent ?? 0.17) * mult;

  // Sebelum PPN (setelah class multiplier pada komponen berbayar)
  // BBM/driver mengikuti jarak; layanan × class
  const tarifSebelumPPN = (totalBBM + totalBBM * (rules.serviceFeePercent ?? 0.17)) * mult;
  // Lebih jelas: (totalBBM * mult) + serviceFee — serviceFee sudah × mult
  const beforePpn = totalBBM * mult + serviceFee;

  const tax = beforePpn * (rules.taxPercent ?? 0.11);
  const rawTotal = beforePpn + tax;
  const total = Math.ceil(rawTotal / 500) * 500;

  return {
    total,
    tripFuel: Math.round(tripFuel * mult),
    pickupFuel: Math.round(pickupFuel * mult),
    totalBBM: Math.round(totalBBM * mult),
    perawatan: Math.round(perawatan * mult),
    makanKesehatan: Math.round(makanKesehatan * mult),
    jasaDriver: Math.round(jasaDriver * mult),
    pendapatanBersih: Math.round(pendapatanBersih * mult),
    serviceFee: Math.round(serviceFee),
    tax: Math.round(tax),
    beforePpn: Math.round(beforePpn),
    // kompatibilitas field lama
    driverPool: Math.round(pendapatanBersih * mult),
    driverGross: Math.round(pendapatanBersih * mult),
    operatingBase: Math.round(totalBBM * mult),
    poolPercent: 1,
    classMultiplier: mult,
    serviceClass,
    tripKm: trip,
    pickupKm: pickup,
    fuelPerKm,
    rulesVersion: rules.version,
    breakdown: {
      tripFuel: Math.round(tripFuel * mult),
      pickupFuel: Math.round(pickupFuel * mult),
      perawatan: Math.round(perawatan * mult),
      makanKesehatan: Math.round(makanKesehatan * mult),
      jasaDriver: Math.round(jasaDriver * mult),
      pendapatanBersih: Math.round(pendapatanBersih * mult),
      serviceFee: Math.round(serviceFee),
      beforePpn: Math.round(beforePpn),
      tax: Math.round(tax),
      total
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
      const remote = snap.val();
      return {
        ...DEFAULT_FARE_RULES,
        ...remote,
        classMultipliers: {
          ...DEFAULT_FARE_RULES.classMultipliers,
          ...(remote.classMultipliers || {})
        }
      };
    }
  } catch (e) {
    console.warn("Gagal ambil fareRules, pakai default:", e.message);
  }
  return DEFAULT_FARE_RULES;
}
