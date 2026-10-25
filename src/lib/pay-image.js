import QRCode from 'qrcode';

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * Render a shareable PNG "poster" of a PromptPay payment:
 * gradient card, who pays whom, the amount, and a scannable QR on white.
 */
export async function renderPayImage({ payload, fromName, toName, amountText, idText }) {
  // Canvas only uses fonts that are already loaded; load the exact faces first.
  try {
    await Promise.all([
      document.fonts.load("600 150px 'Inter Variable'", '฿0123456789.,'),
      document.fonts.load('500 44px Anuphan', 'โอนให้'),
    ]);
  } catch {
    /* fall back to whatever is available */
  }
  const W = 1080;
  const H = 1500;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const font = (w, px) => `${w} ${px}px 'Inter Variable', Inter, Anuphan, system-ui, sans-serif`;

  g.fillStyle = '#090909';
  g.fillRect(0, 0, W, H);

  g.save();
  roundRect(g, 40, 40, W - 80, H - 80, 60);
  g.clip();
  g.fillStyle = '#6a4cf5';
  g.fillRect(0, 0, W, H);
  const glow = (x, y, r, color) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(106,76,245,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  };
  glow(180, 220, 620, '#d44df0');
  glow(980, 1360, 700, '#ff7a3d');
  g.restore();

  g.fillStyle = '#ffffff';
  g.textBaseline = 'alphabetic';
  g.font = font(500, 44);
  g.fillText(`${fromName} โอนให้ ${toName}`, 110, 175, W - 220);

  g.font = font(600, 150);
  if ('letterSpacing' in g) g.letterSpacing = '-6px';
  g.fillText(amountText, 102, 330, W - 220);
  if ('letterSpacing' in g) g.letterSpacing = '0px';

  const tile = { x: 140, y: 410, s: 800 };
  g.fillStyle = '#ffffff';
  g.shadowColor = 'rgba(0,0,0,0.25)';
  g.shadowBlur = 50;
  g.shadowOffsetY = 20;
  roundRect(g, tile.x, tile.y, tile.s, tile.s, 48);
  g.fill();
  g.shadowColor = 'transparent';

  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, payload, { width: 700, margin: 0, errorCorrectionLevel: 'M' });
  g.imageSmoothingEnabled = false;
  g.drawImage(qr, tile.x + 50, tile.y + 50, 700, 700);

  g.fillStyle = '#ffffff';
  g.font = font(500, 40);
  g.fillText(`พร้อมเพย์ ${idText}`, 110, 1330, W - 220);
  g.globalAlpha = 0.75;
  g.font = font(500, 30);
  g.fillText('สแกนด้วยแอปธนาคาร ตรวจชื่อผู้รับก่อนกดยืนยัน', 110, 1390, W - 220);
  g.globalAlpha = 1;

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

/** Share via the OS sheet when possible (phones), otherwise download. */
export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
