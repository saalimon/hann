// Firebase web config is injected at build time from the VITE_FIREBASE_CONFIG
// environment variable (a JSON object), so no keys live in the repository.
//   - GitHub Pages build: repository secret FIREBASE_CONFIG (see README)
//   - Local dev: put VITE_FIREBASE_CONFIG in .env.local (see .env.example)
//
// Note: whatever ends up in a web bundle is readable by anyone who loads the
// site. Access is protected by database.rules.json plus API key restrictions
// in Google Cloud Console, not by keeping these values hidden.

const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId', 'databaseURL'];

function readConfig() {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!raw) return null;
  try {
    const config = JSON.parse(raw);
    return REQUIRED.every((k) => typeof config[k] === 'string' && config[k]) ? config : null;
  } catch {
    return null;
  }
}

/** The Firebase config, or null when it was not provided at build time. */
export const firebaseConfig = readConfig();
