// Per-device memory: bills opened on this device and "which member am I" per bill.
const RECENT_KEY = 'hann.recent';
const ME_KEY = 'hann.me';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — the app still works for this visit */
  }
}

export function recentBills() {
  return read(RECENT_KEY, []);
}

export function rememberBill(sid, title) {
  const list = recentBills().filter((b) => b.sid !== sid);
  list.unshift({ sid, title, at: Date.now() });
  write(RECENT_KEY, list.slice(0, 30));
}

export function forgetBill(sid) {
  write(
    RECENT_KEY,
    recentBills().filter((b) => b.sid !== sid)
  );
}

export function getMe(sid) {
  return read(ME_KEY, {})[sid] || null;
}

export function setMe(sid, memberId) {
  const all = read(ME_KEY, {});
  if (memberId) all[sid] = memberId;
  else delete all[sid];
  write(ME_KEY, all);
}
