// All money is stored as integer satang (1 baht = 100 satang) to avoid float drift.

export const SERVICE_RATE = 0.10;
export const VAT_RATE = 0.07;

/** Parse user input like "1,250.5" or "฿99" into satang, or null if invalid. */
export function parseBaht(input) {
  const s = String(input ?? '').replace(/[,\s฿]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const satang = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  return Number.isSafeInteger(satang) ? satang : null;
}

const fmt = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWhole = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

/** "1,234.50" */
export function formatBaht(satang) {
  return fmt.format((satang || 0) / 100);
}

/** Split into whole and decimal parts for big-number display: ["1,234", "50"] */
export function splitBaht(satang) {
  const v = Math.round(satang || 0);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  return [sign + fmtWhole.format(Math.floor(abs / 100)), String(abs % 100).padStart(2, '0')];
}

/** Input-friendly string "1250.50" (no grouping) */
export function toInputBaht(satang) {
  if (!satang) return '';
  const s = (satang / 100).toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
}

/** Item total including optional 10% service charge and 7% VAT (VAT applies on top of service). */
export function itemTotal(item) {
  const base = item.amount || 0;
  const sc = item.sc ? Math.round(base * SERVICE_RATE) : 0;
  const vat = item.vat ? Math.round((base + sc) * VAT_RATE) : 0;
  return base + sc + vat;
}
