import React, {
 memo, useState, useCallback,
} from 'react';

import ControlPanel, { PanelModeCodes } from './ControlPanel';
import PlayerStatsPanel from './PlayerStatsPanel';
import RatingPanel from './RatingPanel';

function CustomTournamentInfoPanel({
  roundsLimit = 1,
  currentRound = 0,
  matches,
  players,
  currentUserId,
  pageNumber,
  pageSize,
}) {
  const [searchedUser, setSearchedUser] = useState();
  const [panelMode, setPanelMode] = useState(
    players[currentUserId]
      ? PanelModeCodes.playerMode
      : PanelModeCodes.ratingMode,
  );

  const togglePanelMode = useCallback(() => {
    setPanelMode(mode => (
      mode === PanelModeCodes.playerMode
        ? PanelModeCodes.ratingMode
        : PanelModeCodes.playerMode
    ));
  }, [setPanelMode]);

  return (
    <>
      <ControlPanel
        searchOption={searchedUser}
        panelMode={panelMode}
        setSearchOption={setSearchedUser}
        togglePanelMode={togglePanelMode}
        disabledPanelModeControl={!players[currentUserId]}
      />
      {panelMode === PanelModeCodes.playerMode && (
        <PlayerStatsPanel
          currentRound={currentRound}
          roundsLimit={roundsLimit}
          matches={matches}
          players={players}
          currentUserId={currentUserId}
        />
      )}
      {panelMode === PanelModeCodes.ratingMode && (
        <RatingPanel
          searchedUser={searchedUser}
          roundsLimit={roundsLimit}
          currentRound={currentRound}
          matches={matches}
          players={players}
          currentUserId={currentUserId}
          pageNumber={pageNumber}
          pageSize={pageSize}
        />
      )}
    </>
  );
}

export default memo(CustomTournamentInfoPanel);
