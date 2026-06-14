import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import App from './App.jsx';
import './styles.css';
import { initServiceWorker } from './lib/pushNotification.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(initServiceWorker).catch(() => {});
  });
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set. Add it to .env.local and Vercel env vars.');
}

// Handle the OAuth callback route Clerk redirects back to after Google sign-in.
const isSSOCallback = window.location.pathname === '/sso-callback';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {isSSOCallback
        ? <AuthenticateWithRedirectCallback />
        : <App />
      }
    </ClerkProvider>
  </StrictMode>
);
