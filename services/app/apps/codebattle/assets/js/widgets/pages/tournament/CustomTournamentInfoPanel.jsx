import React, {
 memo, useState, useCallback,
} from 'react';

import { CSSTransition, SwitchTransition } from 'react-transition-group';

import ControlPanel, { PanelModeCodes } from './ControlPanel';
import PlayerStatsPanel from './PlayerStatsPanel';
import RatingPanel from './RatingPanel';

function CustomTournamentInfoPanel({
  roundsLimit = 1,
  currentRound = 0,
  matches,
  players,
  topPlayersIds,
  currentUserId,
  pageNumber,
  pageSize,
  showResults = false,
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
              disabledPanelModeControl={!players[currentUserId] || (!showResults && !isAdmin && !isOwner)}
              disabledSearch={!isAdmin && !isOwner}
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
                topPlayersIds={topPlayersIds}
                currentUserId={currentUserId}
                pageNumber={pageNumber}
                pageSize={pageSize}
                showResults={showResults || isAdmin || isOwner}
              />
            )}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </>
  );
}

export default memo(CustomTournamentInfoPanel);
