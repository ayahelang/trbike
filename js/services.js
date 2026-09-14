/**
 * TRBike — Katalog layanan (gabungan Gojek / Grab / Maxim / ShopeeFood style)
 * Driver bisa aktifkan per layanan dari dashboard.
 */

const TRBIKE_SERVICES = [
  {
    id: "ride",
    name: "TRRide",
    short: "Antar orang",
    icon: "🛵",
    color: "#22c55e",
    desc: "Ojek antar penumpang ke tujuan (setara GoRide / GrabBike / Maxim Bike).",
    for: "passenger",
    fields: ["dest"]
  },
  {
    id: "food",
    name: "TRFood",
    short: "Makanan",
    icon: "🍜",
    color: "#ef4444",
    desc: "Ambil pesanan makanan dari resto / warung / cafe lalu antar ke penerima (GoFood / GrabFood / ShopeeFood).",
    for: "merchant",
    fields: ["pickupNote", "dest", "itemNote"]
  },
  {
    id: "send",
    name: "TRSend",
    short: "Kirim paket",
    icon: "📦",
    color: "#3b82f6",
    desc: "Kirim dokumen atau paket ringan instan dalam kota (GoSend / GrabExpress / Maxim Delivery).",
    for: "anyone",
    fields: ["pickupNote", "dest", "itemNote"]
  },
  {
    id: "mart",
    name: "TRMart",
    short: "Belanja mart",
    icon: "🛒",
    color: "#8b5cf6",
    desc: "Belanja kebutuhan di minimarket / supermarket terdekat lalu diantar (GoMart / GrabMart).",
    for: "passenger",
    fields: ["dest", "itemNote"]
  },
  {
    id: "shop",
    name: "TRShop",
    short: "Titip belanja",
    icon: "🛍️",
    color: "#f59e0b",
    desc: "Titip beli barang di toko / pasar / apotek sesuai daftar belanja Anda (GoShop / Grab Jastip).",
    for: "anyone",
    fields: ["pickupNote", "dest", "itemNote"]
  },
  {
    id: "pharmacy",
    name: "TRObat",
    short: "Apotek",
    icon: "💊",
    color: "#14b8a6",
    desc: "Ambil obat / resep di apotek dan antar ke rumah / klinik.",
    for: "merchant",
    fields: ["pickupNote", "dest", "itemNote"]
  },
  {
    id: "laundry",
    name: "TRCuci",
    short: "Laundry",
    icon: "👕",
    color: "#06b6d4",
    desc: "Antar-jemput laundry / dry clean.",
    for: "merchant",
    fields: ["pickupNote", "dest", "itemNote"]
  },
  {
    id: "gift",
    name: "TRGift",
    short: "Hadiah & bunga",
    icon: "🎁",
    color: "#ec4899",
    desc: "Kirim bunga, kue, atau hadiah ke alamat penerima.",
    for: "anyone",
    fields: ["pickupNote", "dest", "itemNote"]
  },
  {
    id: "docs",
    name: "TRDocs",
    short: "Dokumen",
    icon: "📄",
    color: "#64748b",
    desc: "Antar dokumen kantor, kontrak, berkas sekolah / kampus.",
    for: "anyone",
    fields: ["pickupNote", "dest", "itemNote"]
  },
  {
    id: "custom",
    name: "TRBantu",
    short: "Bantuan lain",
    icon: "✨",
    color: "#a855f7",
    desc: "Permintaan khusus dalam radius motor (ambil antrian, titip bayar, dll).",
    for: "anyone",
    fields: ["pickupNote", "dest", "itemNote"]
  }
];

const DEFAULT_DRIVER_SERVICES = ["ride", "send", "food"];

function getServiceById(id) {
  return TRBIKE_SERVICES.find((s) => s.id === id) || TRBIKE_SERVICES[0];
}

function serviceLabel(id) {
  const s = getServiceById(id);
  return s ? s.name + " · " + s.short : id;
}
