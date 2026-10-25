// Firebase web config (client keys are public by design; access is controlled by
// Realtime Database security rules in database.rules.json).
export const firebaseConfig = {
  apiKey: 'REDACTED_API_KEY',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.firebasestorage.app',
  messagingSenderId: 'REDACTED_SENDER_ID',
  appId: 'REDACTED_APP_ID',
  // Copy the exact URL shown at the top of Firebase Console → Realtime Database.
  // US instances look like https://<project>-default-rtdb.firebaseio.com,
  // Singapore ones like https://<project>-default-rtdb.asia-southeast1.firebasedatabase.app
  // It can also be set at build time with VITE_FIREBASE_DATABASE_URL.
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app',
};
