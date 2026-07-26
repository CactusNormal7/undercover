import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Les liens d'invitation sont de la forme /r/ABC123 : tout doit retomber
  // sur index.html, c'est une SPA.
  appType: 'spa',
});
