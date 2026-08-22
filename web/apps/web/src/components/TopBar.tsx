import { AccountControls } from '../auth.js';
import { ThemeToggle } from '../theme.js';

/** Bandeau discret présent sur tous les écrans : thème à gauche, compte à droite. */
export function TopBar() {
  return (
    <div className="top-bar">
      <ThemeToggle />
      <AccountControls />
    </div>
  );
}
