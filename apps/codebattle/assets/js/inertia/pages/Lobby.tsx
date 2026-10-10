import React, { useEffect } from 'react';

import { Lobby } from '../../widgets/App';

export default function LobbyPage() {
  useEffect(() => {
    // The server renders a skeleton shell next to the Inertia mount node
    // (see CodebattleWeb.LobbyLoadingHelpers). CSS hides it once #app has
    // content, but drop it from the DOM as well so it can never linger below
    // the real lobby if the surrounding markup changes again.
    document.getElementById('lobby-loading-shell')?.remove();
  }, []);

  return (
    <div className="container-lg cb-text">
      <Lobby />
    </div>
  );
}
