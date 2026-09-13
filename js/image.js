/**
 * Kompres & resize foto di browser sebelum upload
 * Target: max sisi 1024px, JPEG quality ~0.7, ideal < 300KB
 */

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * @param {File} file
 * @param {{ maxSide?: number, quality?: number, maxBytes?: number }} opts
 * @returns {Promise<Blob>}
 */
async function compressImage(file, opts = {}) {
  const maxSide = opts.maxSide || 1024;
  const quality = opts.quality || 0.72;
  const maxBytes = opts.maxBytes || 350 * 1024;

  if (!file || !file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar");
  }
  // Tolak file mentah terlalu besar sebelum proses
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 8 MB sebelum kompresi");
  }

  const img = await loadImageFile(file);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  let q = quality;
  let blob = await canvasToBlob(canvas, "image/jpeg", q);
  // Turunkan quality jika masih besar
  while (blob.size > maxBytes && q > 0.4) {
    q -= 0.08;
    blob = await canvasToBlob(canvas, "image/jpeg", q);
  }
  return blob;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

/** Upload blob ke Firebase Storage, return download URL */
async function uploadCompressed(uid, blob, kind) {
  if (!storage) throw new Error("Firebase Storage belum aktif");
  const path = `kyc/${uid}/${kind}_${Date.now()}.jpg`;
  const ref = storage.ref().child(path);
  await ref.put(blob, { contentType: "image/jpeg" });
  return await ref.getDownloadURL();
}
