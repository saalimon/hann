const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Cryptographically random base62 id. 22 chars ≈ 131 bits — unguessable. */
export function randomId(length = 22) {
  const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
  let out = '';
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // rejection sampling keeps the distribution uniform (248 = 62 * 4)
    if (bytes[i] < 248) out += ALPHABET[bytes[i] % 62];
  }
  return out.length === length ? out : out + randomId(length - out.length);
}

/** Short, time-ordered id for list children (members, items). */
export function childId() {
  return Date.now().toString(36) + randomId(6);
}
