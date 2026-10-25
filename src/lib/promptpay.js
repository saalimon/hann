// PromptPay QR payload (EMVCo Merchant Presented Mode, Bank of Thailand spec).
// Supports phone numbers (10 digits), national ID / tax ID (13 digits)
// and e-wallet IDs (15 digits).

const GUID_PROMPTPAY = 'A000000677010111';

const field = (id, value) => id + String(value.length).padStart(2, '0') + value;

export function sanitizeId(raw) {
  return String(raw ?? '').replace(/[^0-9]/g, '');
}

/** Returns { type: 'phone' | 'nid' | 'ewallet', digits } or null when invalid. */
export function parsePromptPayId(raw) {
  const digits = sanitizeId(raw);
  if (/^0[0-9]{9}$/.test(digits)) return { type: 'phone', digits };
  if (/^66[0-9]{9}$/.test(digits)) return { type: 'phone', digits: '0' + digits.slice(2) };
  if (/^[0-9]{13}$/.test(digits)) return { type: 'nid', digits };
  if (/^[0-9]{15}$/.test(digits)) return { type: 'ewallet', digits };
  return null;
}

export const ID_TYPE_LABEL = {
  phone: 'เบอร์โทร',
  nid: 'เลขบัตรประชาชน / ผู้เสียภาษี',
  ewallet: 'e-Wallet',
};

/** Human formatting for display: 081-234-5678 / 1-2345-67890-12-3 */
export function formatPromptPayId(raw, { mask = false } = {}) {
  const p = parsePromptPayId(raw);
  if (!p) return sanitizeId(raw);
  const d = p.digits;
  if (p.type === 'phone') {
    const s = mask ? d.slice(0, 3) + 'xxx' + d.slice(6) : d;
    return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
  }
  if (p.type === 'nid') {
    const s = mask ? d.slice(0, 1) + 'xxxxxxxx' + d.slice(9) : d;
    return `${s.slice(0, 1)}-${s.slice(1, 5)}-${s.slice(5, 10)}-${s.slice(10, 12)}-${s.slice(12)}`;
  }
  return mask ? d.slice(0, 3) + 'x'.repeat(8) + d.slice(11) : d;
}

export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Build the PromptPay payload string.
 * @param {string} id phone / national ID / e-wallet
 * @param {number} [amountSatang] integer amount in satang; omit for "any amount"
 */
export function promptPayPayload(id, amountSatang) {
  const p = parsePromptPayId(id);
  if (!p) throw new Error('INVALID_PROMPTPAY_ID');

  let target;
  let subId;
  if (p.type === 'phone') {
    subId = '01';
    target = ('0000000000000' + p.digits.replace(/^0/, '66')).slice(-13);
  } else if (p.type === 'nid') {
    subId = '02';
    target = p.digits;
  } else {
    subId = '03';
    target = p.digits;
  }

  const hasAmount = Number.isInteger(amountSatang) && amountSatang > 0;
  const parts = [
    field('00', '01'),
    field('01', hasAmount ? '12' : '11'),
    field('29', field('00', GUID_PROMPTPAY) + field(subId, target)),
    field('58', 'TH'),
    field('53', '764'),
  ];
  if (hasAmount) parts.push(field('54', (amountSatang / 100).toFixed(2)));

  const body = parts.join('') + '6304';
  return body + crc16(body);
}
