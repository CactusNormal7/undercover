import { useEffect, useState } from 'react';

/**
 * Thème clair / sombre.
 *
 * Trois états et non deux : « système » est le défaut, et il faut pouvoir y
 * revenir après avoir choisi — sinon un utilisateur qui essaie le mode clair
 * une fois ne récupère plus jamais le suivi automatique de son OS.
 *
 * Le choix vit sur `<html data-theme>`, pas dans un contexte React : c'est le
 * CSS qui décide (cf. `styles.css`), et l'attribut peut donc être posé avant le
 * premier rendu, sans flash de la mauvaise couleur.
 */

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'undercover.theme';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

const LABELS: Record<ThemePreference, string> = {
  system: 'Thème : système',
  light: 'Thème : clair',
  dark: 'Thème : sombre',
};

export function storedPreference(): ThemePreference {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement;
  // Rien à poser pour « système » : l'absence d'attribut *est* l'état par défaut.
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;
}

/** Bouton cyclique : système → clair → sombre → système. */
export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(storedPreference);

  useEffect(() => {
    applyPreference(preference);
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]!;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setPreference(next)}
      aria-label={`${LABELS[preference]}. Basculer vers « ${LABELS[next].replace('Thème : ', '')} ».`}
      title={LABELS[preference]}
    >
      <ThemeIcon preference={preference} />
    </button>
  );
}

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (preference === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
      </svg>
    );
  }
  if (preference === 'dark') {
    return (
      <svg {...common}>
        <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" />
      </svg>
    );
  }
  // Système : un disque moitié plein, moitié vide.
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
