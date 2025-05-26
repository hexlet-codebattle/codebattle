import React, { memo } from 'react';

import Notifications from './Notifications';
import TournamentRankingTable from './TournamentRankingTable';

const TournamentCurrentPlayerRankingPanel = () => (
  <div
    className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100 rounded-lg bg-white"
  >
    <TournamentRankingTable />
    <div className="flex-shrink-1 p-0 border-left rounded-right cb-game-control-container">
      <div className="d-flex flex-column justify-content-start overflow-auto h-100">
        <div className="px-3 py-3 w-100 d-flex flex-column">
          <Notifications />
        </div>
      </div>
    </div>
  </div>
  );

export default memo(TournamentCurrentPlayerRankingPanel);
