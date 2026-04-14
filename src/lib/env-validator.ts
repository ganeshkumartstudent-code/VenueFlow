/**
 * Validates existence of required environment variables on startup
 */
const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

export const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    const errorMsg = `CRITICAL CONFIG ERROR: Missing Environment Variables: ${missing.join(', ')}. Please check your .env file.`;
    console.error(errorMsg);
    // In production, we might want to show a specialized error UI
    if (import.meta.env.PROD) {
      document.body.innerHTML = `<div style="padding: 2rem; background: #000; color: #fff;"><h1>System Configuration Error</h1><p>${errorMsg}</p></div>`;
    }
    throw new Error(errorMsg);
  }
};
