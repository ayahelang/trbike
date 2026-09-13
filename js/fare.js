/**
 * TRBike — Fair Fare Engine
 * ---------------------------------------------------------
 * Algoritma tarif transparan sesuai prinsip:
 * 1. BBM dihitung untuk trip + pickup
 * 2. Driver pool = hak driver (bukan gaji platform)
 * 3. Service fee & pajak ditampilkan jelas
 * 4. Parameter bisa diubah lewat Firebase (fareRules/current)
 *
 * Catatan skripsi:
 * - Angka default adalah parameter prototype
 * - Harus divalidasi dengan riset lapangan & benchmark kompetitor
 * - Target "20% lebih murah" belum di-enforce di formula ini
 *   (perlu data kompetitor yang valid)
 */

const DEFAULT_FARE_RULES = {
  fuelPricePerLiter: 12500,           // Rp / liter (Pertamax contoh)
  fuelEfficiencyKmPerLiter: 40,       // km / liter (asumsi motor)
  baseFare: 2500,                     // biaya dasar
  serviceFeePercent: 0.17,            // 17% dari (operating + driverPool)
  taxPercent: 0.11,                   // 11% dari service fee (PPN contoh)
  pools: {
    maintenance: 0.10,                // perawatan
    labor: 0.10,                      // tenaga / effort
    health: 0.10,                     // kesehatan
    oldAge: 0.05,                     // hari tua
    charity: 0.025,                   // charity
    food: 0.075                       // makan
  },
  classMultipliers: {
    standard: 1.0,
    comfort: 1.1,
    premium: 1.2
  },
  version: "1.0.0-mvp"
};

/**
 * Hitung tarif lengkap dengan breakdown
 * @param {number} tripKm
 * @param {number} pickupKm
 * @param {string} serviceClass  standard | comfort | premium
 * @param {object} rules
 * @returns {object}
 */
function calculateFare(tripKm, pickupKm, serviceClass = "standard", rules = DEFAULT_FARE_RULES) {
  const trip = Math.max(0, Number(tripKm) || 0);
  const pickup = Math.max(0, Number(pickupKm) || 0);
  const mult = rules.classMultipliers[serviceClass] || 1;

  // 1. Biaya BBM
  const fuelPerKm = rules.fuelPricePerLiter / rules.fuelEfficiencyKmPerLiter;
  const tripFuel = trip * fuelPerKm;
  const pickupFuel = pickup * fuelPerKm;

  // 2. Operating base (biaya operasional nyata)
  const operatingBase = rules.baseFare + tripFuel + pickupFuel;

  // 3. Driver pool (hak driver)
  const poolPercent = Object.values(rules.pools).reduce((sum, v) => sum + v, 0);
  const driverPool = operatingBase * poolPercent;

  // 4. Service fee platform
  const serviceFeeBase = (operatingBase + driverPool) * rules.serviceFeePercent;
  const serviceFee = serviceFeeBase * mult;

  // 5. Pajak (dari service fee)
  const tax = serviceFeeBase * rules.taxPercent * mult;

  // 6. Total sebelum pembulatan
  const subtotal = (operatingBase + driverPool + serviceFeeBase) * mult;
  const rawTotal = subtotal + tax;

  // 7. Pembulatan ke kelipatan Rp 500 (standar ojek online)
  const total = Math.ceil(rawTotal / 500) * 500;

  // 8. Hak driver yang diterima
  const driverGross = total - serviceFee - tax;

  return {
    total,
    tripFuel: Math.round(tripFuel),
    pickupFuel: Math.round(pickupFuel),
    operatingBase: Math.round(operatingBase),
    driverPool: Math.round(driverPool),
    serviceFee: Math.round(serviceFee),
    tax: Math.round(tax),
    driverGross: Math.round(driverGross),
    poolPercent,
    classMultiplier: mult,
    serviceClass,
    tripKm: trip,
    pickupKm: pickup,
    rulesVersion: rules.version,
    breakdown: {
      baseFare: rules.baseFare,
      tripFuel: Math.round(tripFuel),
      pickupFuel: Math.round(pickupFuel),
      driverPool: Math.round(driverPool),
      serviceFee: Math.round(serviceFee),
      tax: Math.round(tax),
      total
    }
  };
}

/** Format ke Rupiah */
function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(n || 0);
}

/**
 * Ambil parameter tarif dari Firebase.
 * Fallback ke DEFAULT jika gagal / belum di-seed.
 */
async function getFareRules() {
  try {
    const snap = await db.ref("fareRules/current").once("value");
    if (snap.exists()) {
      const remote = snap.val();
      // Merge agar key yang kurang di remote tetap ada default-nya
      return {
        ...DEFAULT_FARE_RULES,
        ...remote,
        pools: { ...DEFAULT_FARE_RULES.pools, ...(remote.pools || {}) },
        classMultipliers: { ...DEFAULT_FARE_RULES.classMultipliers, ...(remote.classMultipliers || {}) }
      };
    }
  } catch (e) {
    console.warn("Gagal ambil fareRules, pakai default:", e.message);
  }
  return DEFAULT_FARE_RULES;
}
