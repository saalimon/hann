// In-browser stand-in for Firebase, used with `VITE_BACKEND=local` for offline
// development and UI testing. Data lives in localStorage and syncs across tabs.
// Each tab gets its own uid (sessionStorage) so one-time links can be tested
// by opening them in a second tab.
import { randomId } from '../ids.js';
import { BackendError, INVITE_TTL_MS } from './errors.js';

const KEY = 'hann.localdb';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hann-local') : null;
const listeners = new Set();
let uid = null;

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};
const save = (tree) => {
  localStorage.setItem(KEY, JSON.stringify(tree));
  notify();
  channel?.postMessage('changed');
};
const notify = () => listeners.forEach((fn) => fn());
channel?.addEventListener('message', notify);

function setPath(tree, path, value) {
  const keys = path.split('/').filter(Boolean);
  let node = tree;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof node[keys[i]] !== 'object' || node[keys[i]] === null) node[keys[i]] = {};
    node = node[keys[i]];
  }
  const last = keys[keys.length - 1];
  if (value === null || value === undefined) delete node[last];
  else node[last] = structuredClone(value);
}

const getPath = (tree, path) =>
  path.split('/').filter(Boolean).reduce((n, k) => (n == null ? undefined : n[k]), tree);

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export async function init() {
  uid = sessionStorage.getItem('hann.localuid');
  if (!uid) {
    uid = 'local-' + randomId(8);
    sessionStorage.setItem('hann.localuid', uid);
  }
  await delay(200);
  return { uid };
}

export const getUid = () => uid;

const isMember = (tree, sid) => !!getPath(tree, `sessions/${sid}/access/${uid}`);

export async function createSession({ title, firstMember }) {
  await delay();
  const tree = load();
  const sid = randomId(22);
  const now = Date.now();
  const session = { meta: { title, createdAt: now, createdBy: uid }, access: { [uid]: true } };
  if (firstMember) session.members = { [firstMember.id]: { ...firstMember.data, createdAt: now } };
  setPath(tree, `sessions/${sid}`, session);
  save(tree);
  return sid;
}

export function watchSession(sid, onData, onError) {
  let last;
  const emit = () => {
    const tree = load();
    const s = getPath(tree, `sessions/${sid}`);
    if (s && !isMember(tree, sid)) return onError(new BackendError('PERMISSION'));
    const json = JSON.stringify(s ?? null);
    if (json === last) return;
    last = json;
    onData(s ? JSON.parse(json) : null);
  };
  listeners.add(emit);
  setTimeout(emit, 150);
  return () => listeners.delete(emit);
}

export async function patch(sid, updates) {
  await delay(60);
  const tree = load();
  if (!isMember(tree, sid)) throw new BackendError('PERMISSION');
  for (const [path, value] of Object.entries(updates)) setPath(tree, `sessions/${sid}/${path}`, value);
  save(tree);
}

export async function createInvite(sid) {
  await delay();
  const tree = load();
  if (!isMember(tree, sid)) throw new BackendError('PERMISSION');
  const token = randomId(24);
  const expiresAt = Date.now() + INVITE_TTL_MS;
  setPath(tree, `invites/${token}`, { sid, createdBy: uid, createdAt: Date.now(), expiresAt });
  setPath(tree, `sessions/${sid}/invites/${token}`, { createdAt: Date.now(), expiresAt });
  save(tree);
  return token;
}

export async function revokeInvite(sid, token) {
  await delay();
  const tree = load();
  setPath(tree, `invites/${token}`, null);
  setPath(tree, `sessions/${sid}/invites/${token}`, null);
  save(tree);
}

export async function claimInvite(token) {
  await delay(500);
  const tree = load();
  const inv = getPath(tree, `invites/${token}`);
  if (!inv) throw new BackendError('INVITE_GONE');
  if (inv.usedBy && inv.usedBy !== uid) throw new BackendError('INVITE_GONE');
  if (!inv.usedBy && inv.expiresAt < Date.now()) throw new BackendError('INVITE_GONE');
  const now = Date.now();
  setPath(tree, `invites/${token}/usedBy`, uid);
  setPath(tree, `invites/${token}/usedAt`, now);
  setPath(tree, `sessions/${inv.sid}/access/${uid}`, token);
  setPath(tree, `sessions/${inv.sid}/invites/${token}/usedBy`, uid);
  setPath(tree, `sessions/${inv.sid}/invites/${token}/usedAt`, now);
  save(tree);
  return inv.sid;
}
