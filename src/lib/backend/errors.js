export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const GROUP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class BackendError extends Error {
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Normalise Firebase errors into a few codes the UI knows how to explain:
 * AUTH_DISABLED, PERMISSION, NETWORK, INVITE_GONE, UNKNOWN
 */
export function toBackendError(err, permissionCode = 'PERMISSION') {
  if (err instanceof BackendError) return err;
  const text = `${err?.code || ''} ${err?.message || err}`.toLowerCase();
  if (
    text.includes('operation-not-allowed') ||
    text.includes('admin-restricted-operation') ||
    text.includes('configuration-not-found')
  ) {
    return new BackendError('AUTH_DISABLED', err);
  }
  if (text.includes('permission')) return new BackendError(permissionCode, err);
  if (text.includes('network') || text.includes('offline')) return new BackendError('NETWORK', err);
  console.error(err);
  return new BackendError('UNKNOWN', err);
}
