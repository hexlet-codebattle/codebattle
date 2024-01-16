import React, {
 memo, useState, useCallback,
} from 'react';

import { CSSTransition, SwitchTransition } from 'react-transition-group';

import ControlPanel, { PanelModeCodes } from './ControlPanel';
import PlayerStatsPanel from './PlayerStatsPanel';
import RatingPanel from './RatingPanel';

function CustomTournamentInfoPanel({
  roundsLimit = 1,
  currentRoundPosition = 0,
  matches,
  players,
  topPlayerIds,
  currentUserId,
  pageNumber,
  pageSize,
  hideResults = false,
  isAdmin = false,
  isOwner = false,
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
      <SwitchTransition mode="out-in">
        <CSSTransition
          key={panelMode}
          addEndListener={(node, done) => {
            node.addEventListener('transitionend', done, false);
          }}
          classNames={`tournament-info-${panelMode}`}
        >
          <div>
            <ControlPanel
              searchOption={searchedUser}
              panelMode={panelMode}
              setSearchOption={setSearchedUser}
              togglePanelMode={togglePanelMode}
              disabledPanelModeControl={!players[currentUserId] || (hideResults && !isAdmin && !isOwner)}
              disabledSearch={!isAdmin && !isOwner}
            />
            {panelMode === PanelModeCodes.playerMode && (
              <PlayerStatsPanel
                currentRoundPosition={currentRoundPosition}
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
                currentRoundPosition={currentRoundPosition}
                matches={matches}
                players={players}
                topPlayerIds={topPlayerIds}
                currentUserId={currentUserId}
                pageNumber={pageNumber}
                pageSize={pageSize}
                hideResults={hideResults && !isAdmin && !isOwner}
              />
            )}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </>
  );
}

export default memo(CustomTournamentInfoPanel);
