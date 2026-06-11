import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api/* to the deployed Vercel Edge functions so the
// React dev experience uses the same Claude/Whisper/Redis backend as
// production. Override API_TARGET to point at `vercel dev` locally.
const API_TARGET = process.env.API_TARGET || 'https://launch-vite.vercel.app';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
