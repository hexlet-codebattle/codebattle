import React, { memo } from 'react';

import i18next from 'i18next';

import Notifications from './Notifications';
import TournamentGameRoundClock from './TournamentGameRoundClock';
import TournamentRankingTable from './TournamentRankingTable';

// Game page side panel of a tournament game, stacked to fit its fixed height: the round
// clock, a toolbar with the ranking title and the game actions, then the ranking, which
// scrolls on its own so nothing overlaps.
function TournamentCurrentPlayerRankingPanel() {
  return (
    <div className="cb-tournament-game-panel shadow-sm h-100 cb-bg-panel text-white cb-rounded">
      <TournamentGameRoundClock />
      <div className="cb-tournament-game-panel-toolbar">
        <span className="font-weight-bold">{i18next.t('Ranking')}</span>
        <div className="cb-tournament-game-panel-actions">
          <Notifications />
        </div>
      </div>
      <div className="cb-tournament-game-panel-ranking">
        <TournamentRankingTable />
      </div>
    </div>
  );
}

export default memo(TournamentCurrentPlayerRankingPanel);
