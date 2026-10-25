// Picks the data backend. Production uses Firebase; `VITE_BACKEND=local`
// swaps in a localStorage implementation with the same API for offline dev.
const impl =
  import.meta.env.VITE_BACKEND === 'local'
    ? await import('./local.js')
    : await import('./firebase.js');

export const {
  init,
  getUid,
  createSession,
  watchSession,
  patch,
  createInvite,
  revokeInvite,
  claimInvite,
  addPayment,
  removePayment,
  getSlip,
} = impl;
export { BackendError } from './errors.js';
