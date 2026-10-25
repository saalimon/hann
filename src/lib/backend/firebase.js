import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import { getDatabase, ref, onValue, get, update, serverTimestamp } from 'firebase/database';
import { firebaseConfig } from '../../firebase-config.js';
import { randomId } from '../ids.js';
import { BackendError, INVITE_TTL_MS, GROUP_TTL_MS, toBackendError } from './errors.js';

let auth = null;
let db = null;
let uid = null;

function waitForUser() {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (user) => {
      stop();
      resolve(user);
    });
  });
}

export async function init() {
  // Without a build-time config there is nothing to connect to; the UI explains how to add it.
  if (!firebaseConfig) throw new BackendError('CONFIG_MISSING');
  try {
    if (!auth) {
      const app = initializeApp(firebaseConfig);
      // initializeAuth instead of getAuth: we only sign in anonymously, so we leave out
      // the popup/redirect resolver. That resolver loads a hidden iframe from
      // <project>.firebaseapp.com (eagerly on mobile and Safari) whose scripts register
      // `unload` handlers, which Chrome reports as a permissions-policy violation.
      auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
      db = getDatabase(app);
    }
    const existing = auth.currentUser || (await waitForUser());
    uid = existing ? existing.uid : (await signInAnonymously(auth)).user.uid;
    return { uid };
  } catch (err) {
    throw toBackendError(err);
  }
}

export const getUid = () => uid;

export async function createSession({ title, firstMember }) {
  const sid = randomId(22);
  const now = Date.now();
  const session = {
    meta: { title, createdAt: now, createdBy: uid },
    access: { [uid]: true },
  };
  if (firstMember) session.members = { [firstMember.id]: { ...firstMember.data, createdAt: now } };
  try {
    await update(ref(db), { [`sessions/${sid}`]: session });
  } catch (err) {
    throw toBackendError(err);
  }
  return sid;
}

/** Live subscription. onData receives the session object or null. */
export function watchSession(sid, onData, onError) {
  return onValue(
    ref(db, `sessions/${sid}`),
    (snap) => onData(snap.val()),
    (err) => onError(toBackendError(err))
  );
}

/** Multi-path update relative to the session root, e.g. { 'items/abc': {...}, 'paid/x_y': null }. */
export async function patch(sid, updates) {
  const rooted = {};
  for (const [path, value] of Object.entries(updates)) rooted[`sessions/${sid}/${path}`] = value;
  try {
    await update(ref(db), rooted);
  } catch (err) {
    throw toBackendError(err);
  }
}

/**
 * Create an invite link. One-time links work for the first visitor only;
 * group links (multi) let anyone with the link join until closed or expired.
 */
export async function createInvite(sid, { multi = false } = {}) {
  const token = randomId(24);
  const expiresAt = Date.now() + (multi ? GROUP_TTL_MS : INVITE_TTL_MS);
  const extra = multi ? { multi: true } : {};
  try {
    await update(ref(db), {
      [`invites/${token}`]: { sid, createdBy: uid, createdAt: serverTimestamp(), expiresAt, ...extra },
      [`sessions/${sid}/invites/${token}`]: { createdAt: Date.now(), expiresAt, ...extra },
    });
  } catch (err) {
    throw toBackendError(err);
  }
  return token;
}

export async function revokeInvite(sid, token) {
  try {
    await update(ref(db), {
      [`invites/${token}`]: null,
      [`sessions/${sid}/invites/${token}`]: null,
    });
  } catch (err) {
    throw toBackendError(err);
  }
}

/**
 * Redeem an invite and return { sid, multi }.
 * One-time: the rules only let the first visitor write `usedBy`; after that nobody
 * else can even read the invite, so the link is dead.
 * Group: anyone may join while the link is open; joins are counted on the bill.
 */
export async function claimInvite(token) {
  let invite;
  try {
    invite = (await get(ref(db, `invites/${token}`))).val();
  } catch (err) {
    throw toBackendError(err, 'INVITE_GONE');
  }
  if (!invite || !invite.sid) throw new BackendError('INVITE_GONE');
  const multi = invite.multi === true;
  if (!multi && invite.usedBy && invite.usedBy !== uid) throw new BackendError('INVITE_GONE');
  if ((multi || !invite.usedBy) && invite.expiresAt < Date.now()) throw new BackendError('INVITE_GONE');

  const { sid } = invite;
  try {
    if (!multi && !invite.usedBy) {
      await update(ref(db), {
        [`invites/${token}/usedBy`]: uid,
        [`invites/${token}/usedAt`]: serverTimestamp(),
      });
    }
    // Rules accept this only for an open group link, or a one-time link that names us as its user.
    await update(ref(db), { [`sessions/${sid}/access/${uid}`]: token });
    await update(
      ref(db),
      multi
        ? { [`sessions/${sid}/invites/${token}/joined/${uid}`]: Date.now() }
        : {
            [`sessions/${sid}/invites/${token}/usedBy`]: uid,
            [`sessions/${sid}/invites/${token}/usedAt`]: Date.now(),
          }
    );
  } catch (err) {
    throw toBackendError(err, 'INVITE_GONE');
  }
  return { sid, multi };
}
