import React, {
  memo, useState,
} from 'react';

// import { CSSTransition, SwitchTransition } from 'react-transition-group';

import TournamentTypes from '../../config/tournamentTypes';

import ClansChartPanel from './ClansChartPanel';
import ControlPanel, { PanelModeCodes } from './ControlPanel';
import PlayerStatsPanel from './PlayerStatsPanel';
import RatingClansPanel from './RatingClansPanel';
import RatingPanel from './RatingPanel';
import TaskRankingPanel from './TaskRankingPanel';
import TournamentGameCreatePanel from './TournamentGameCreatePanel';

function CustomTournamentInfoPanel({
  roundsLimit = 1,
  currentRoundPosition = 0,
  matchTimeoutSeconds,
  matches,
  players,
  taskList,
  topPlayerIds,
  currentUserId,
  pageNumber,
  pageSize,
  hideBots = false,
  hideResults = false,
  hideCustomGameConsole = false,
  type,
  state,
  canModerate = false,
}) {
  const [searchedUser, setSearchedUser] = useState();
  const [panelMode, setPanelMode] = useState(
    players[currentUserId]
      ? PanelModeCodes.playerMode
      : PanelModeCodes.ratingMode,
  );

  return (
    <>
      {!hideCustomGameConsole && canModerate && (
        <TournamentGameCreatePanel
          type={type}
          players={players}
          matches={matches}
          taskList={taskList}
          currentRoundPosition={currentRoundPosition}
          defaultMatchTimeoutSeconds={matchTimeoutSeconds}
        />
      )}
      {/* <SwitchTransition mode="out-in"> */}
      {/*   <CSSTransition */}
      {/*     key={panelMode} */}
      {/*     addEndListener={(node, done) => { */}
      {/*       node.addEventListener('transitionend', done, false); */}
      {/*     }} */}
      {/*     classNames={`tournament-info-${panelMode}`} */}
      {/*   > */}
      <div>
        <ControlPanel
          searchOption={searchedUser}
          panelMode={panelMode}
          setSearchOption={setSearchedUser}
          setPanelMode={setPanelMode}
          disabledPanelModeControl={
                !players[currentUserId] || (hideResults && !canModerate) || (type === TournamentTypes.arena && !canModerate)
              }
          disabledSearch={!canModerate}
        />
        {panelMode === PanelModeCodes.playerMode && (
        <PlayerStatsPanel
          currentRoundPosition={currentRoundPosition}
          roundsLimit={roundsLimit}
          matches={matches}
          players={players}
          type={type}
          currentUserId={currentUserId}
          hideBots={hideBots}
          canModerate={canModerate}
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
          hideBots={hideBots}
          hideResults={hideResults && !canModerate}
        />
            )}
        {panelMode === PanelModeCodes.topUserByClansMode && (
        <RatingClansPanel
          type={panelMode}
          state={state}
        />
            )}
        {panelMode === PanelModeCodes.taskRatingMode && (
        <TaskRankingPanel
          type={panelMode}
          state={state}
        />
            )}
        {panelMode === PanelModeCodes.clansBubbleDistributionMode && (
        <ClansChartPanel
          type={panelMode}
          state={state}
        />
            )}
      </div>
      {/*   </CSSTransition> */}
      {/* </SwitchTransition> */}
    </>
  );
}

export default memo(CustomTournamentInfoPanel);
