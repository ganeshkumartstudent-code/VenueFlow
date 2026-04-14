import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateEnv } from './lib/env-validator';

// Validate environment before startup
validateEnv();

// Suppress known Firebase configuration errors in certain environments (like AI Studio)
// properly allowing the AuthProvider fallback to handle them gracefully.
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.code === 'auth/configuration-not-found' || 
      event.reason?.message?.includes('CONFIGURATION_NOT_FOUND')) {
    console.warn("Caught and suppressed expected Firebase configuration error. Falling back to Guest mode.");
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
