import { useCallback, useEffect, useState } from 'react';

import { Home } from './screens/Home.js';
import { RoomScreen } from './screens/RoomScreen.js';

/**
 * Routage minimal, sans dépendance : deux écrans seulement, et les liens
 * d'invitation `/r/CODE` doivent rester partageables tels quels.
 */
export function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
  }, []);

  const match = path.match(/^\/r\/([a-zA-Z0-9]{6})$/);
  if (match) {
    return <RoomScreen code={match[1]!.toUpperCase()} onLeave={() => navigate('/')} />;
  }
  return <Home onEnterRoom={(code) => navigate(`/r/${code}`)} />;
}
