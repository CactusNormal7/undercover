import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { AuthProvider } from './auth.js';
import { applyPreference, storedPreference } from './theme.js';
import './styles.css';

// Avant le premier rendu : évite un éclair dans la mauvaise couleur.
applyPreference(storedPreference());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
