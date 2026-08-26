// Template only — copy this file to firebase-config.js (gitignored, local-only) for local
// testing and fill in real values from Firebase console → Project settings → your web app.
// The deployed site never uses this file: GitHub Actions generates the real
// firebase-config.js at build time from repository secrets (see .github/workflows/deploy-pages.yml).
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
