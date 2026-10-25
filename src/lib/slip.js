// Transfer slips are shrunk in the browser and stored as small JPEG data URLs in
// the Realtime Database, so the app needs no Firebase Storage bucket (which now
// requires the paid Blaze plan). A bank slip stays readable at ~1400px tall.

export const MAX_SLIP_CHARS = 1_400_000; // keep in sync with database.rules.json

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SLIP_UNREADABLE'));
    };
    img.src = url;
  });
}

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> decoding */
    }
  }
  return loadImage(file);
}

/** Resize and re-encode an image file; returns a JPEG data URL under MAX_SLIP_CHARS. */
export async function compressSlip(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('SLIP_NOT_IMAGE');
  const img = await decode(file);
  const w = img.width;
  const h = img.height;
  const attempts = [
    [1400, 0.72],
    [1200, 0.6],
    [1000, 0.5],
    [800, 0.45],
  ];
  for (const [maxSide, quality] of attempts) {
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff'; // flatten transparent PNG screenshots
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_SLIP_CHARS) return dataUrl;
  }
  throw new Error('SLIP_TOO_LARGE');
}
