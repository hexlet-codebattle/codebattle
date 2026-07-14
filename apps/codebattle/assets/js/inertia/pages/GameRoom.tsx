import React from 'react';

import { Game } from '../../widgets/App';

export default function GameRoom() {
  return (
    <div className="w-100">
      <Game />
      <div id="modal-root" style={{ left: 0, position: 'absolute', top: 0 }} />
    </div>
  );
}
