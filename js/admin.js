/**
 * TRBike Admin — cashflow & revenue
 * Login MVP: password client-side (skripsi). Produksi: Auth custom claims.
 */

const ADMIN_PASSWORD = "Bismillaah1234@";

function isAdminSession() {
  return sessionStorage.getItem("trbike_admin") === "1";
}

function adminLogin(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem("trbike_admin", "1");
    return true;
  }
  return false;
}

function adminLogout() {
  sessionStorage.removeItem("trbike_admin");
}

/** Ambil semua rides (untuk admin report) */
async function fetchAllRides() {
  const snap = await db.ref("rides").once("value");
  const list = [];
  snap.forEach((c) => list.push({ id: c.key, ...c.val() }));
  return list;
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function inRange(ts, from, to) {
  if (!ts) return false;
  return ts >= from && ts <= to;
}

/**
 * Agregasi cashflow TRBike
 * Revenue TRBike ≈ sum serviceFee (order completed + cancelCharge ke platform jika ada)
 * Pajak (tabungan) ≈ sum tax dari order completed
 * Pendapatan bersih perusahaan (sederhana) ≈ serviceFee - (opsional biaya); MVP = serviceFee
 */
function buildCashflow(rides, period /* day|week|month|all */) {
  const now = Date.now();
  let from = 0;
  if (period === "day") from = startOfDay(now);
  else if (period === "week") from = now - 7 * 24 * 3600 * 1000;
  else if (period === "month") from = now - 30 * 24 * 3600 * 1000;

  const rows = [];
  let revenueLayanan = 0;
  let taxReserve = 0;
  let driverPay = 0;
  let cancelComp = 0;
  let tips = 0;
  let gmv = 0; // total paid by passengers (completed)
  let countCompleted = 0;
  let countCancelled = 0;

  rides.forEach((r) => {
    const ts = r.completedAt || r.cancelledAt || r.createdAt || 0;
    if (period !== "all" && !inRange(ts, from, now)) return;

    const fee = Number(r.fare?.serviceFee || 0);
    const tax = Number(r.fare?.tax || 0);
    const gross = Number(r.fare?.driverGross || r.fare?.pendapatanBersih || 0);
    const total = Number(r.fare?.total || 0);
    const tip = Number(r.tip || 0);
    const charge = Number(r.cancelCharge?.amount || 0);

    if (r.status === "completed") {
      countCompleted++;
      revenueLayanan += fee;
      taxReserve += tax;
      driverPay += gross;
      tips += tip;
      gmv += total;
      rows.push({
        id: r.id,
        date: ts,
        type: "completed",
        total,
        serviceFee: fee,
        tax,
        driver: gross,
        tip,
        cancelCharge: 0
      });
    } else if (r.status === "cancelled") {
      countCancelled++;
      cancelComp += charge;
      // charge pembatalan ke driver, bukan revenue layanan — catat terpisah
      rows.push({
        id: r.id,
        date: ts,
        type: "cancelled",
        total: 0,
        serviceFee: 0,
        tax: 0,
        driver: charge,
        tip: 0,
        cancelCharge: charge
      });
    }
  });

  rows.sort((a, b) => b.date - a.date);

  // Bersih perusahaan (MVP): revenue biaya layanan; pajak dicatat sebagai kewajiban
  const netCompany = revenueLayanan;
  const netAfterTaxProvision = revenueLayanan; // pajak di-set aside, belum dibayar

  return {
    period,
    from,
    to: now,
    countCompleted,
    countCancelled,
    gmv,
    revenueLayanan,
    taxReserve,
    driverPay,
    tips,
    cancelComp,
    netCompany,
    netAfterTaxProvision,
    rows
  };
}

function cashflowToCSV(report) {
  const lines = [
    "id,tanggal,tipe,total_penumpang,biaya_layanan,ppn,pendapatan_driver,tips,cancel_charge"
  ];
  report.rows.forEach((r) => {
    const d = new Date(r.date).toISOString();
    lines.push(
      [r.id, d, r.type, r.total, r.serviceFee, r.tax, r.driver, r.tip, r.cancelCharge].join(",")
    );
  });
  lines.push("");
  lines.push("RINGKASAN");
  lines.push("Periode," + report.period);
  lines.push("Order selesai," + report.countCompleted);
  lines.push("Order batal," + report.countCancelled);
  lines.push("GMV," + report.gmv);
  lines.push("Revenue biaya layanan (TRBike)," + report.revenueLayanan);
  lines.push("Tabungan/kewajiban PPN," + report.taxReserve);
  lines.push("Pendapatan bersih perusahaan (MVP)," + report.netCompany);
  lines.push("Bayar ke driver (fare)," + report.driverPay);
  lines.push("Tips ke driver," + report.tips);
  lines.push("Kompensasi batal ke driver," + report.cancelComp);
  return lines.join("\n");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
