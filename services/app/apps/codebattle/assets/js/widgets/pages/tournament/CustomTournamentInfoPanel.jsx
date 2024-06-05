import React, { memo, useState, useCallback } from 'react';

// import { CSSTransition, SwitchTransition } from 'react-transition-group';

import TournamentTypes from '../../config/tournamentTypes';

import ClansChartPanel from './ClansChartPanel';
import ControlPanel, { PanelModeCodes } from './ControlPanel';
import PlayerStatsPanel from './PlayerStatsPanel';
import RatingClansPanel from './RatingClansPanel';
import RatingPanel from './RatingPanel';
import TaskRankingAdvancedPanel from './TaskRankingAdvancedPanel';
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
  const [panelHistory, setPanelHistory] = useState([]);
  const [panelMode, setPanelMode] = useState(
    // eslint-disable-next-line no-nested-ternary
    players[currentUserId]
      ? { panel: PanelModeCodes.playerMode }
      : type === TournamentTypes.arena
        ? { panel: PanelModeCodes.topUserByClansMode }
        : { panel: PanelModeCodes.ratingMode },
  );

  const handleTaskSelectClick = useCallback(
    event => {
      const { taskId } = event.currentTarget.dataset;
      setPanelMode({ panel: PanelModeCodes.taskRatingAdvanced, taskId: Number(taskId) });
      setPanelHistory(items => [...items, panelMode]);
    },
    [panelMode, setPanelMode, setPanelHistory],
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
          isPlayer={!!players[currentUserId]}
          searchOption={searchedUser}
          panelMode={panelMode}
          panelHistory={panelHistory}
          setSearchOption={setSearchedUser}
          setPanelMode={setPanelMode}
          setPanelHistory={setPanelHistory}
          disabledPanelModeControl={!canModerate}
          disabledSearch={!canModerate}
        />
        {panelMode.panel === PanelModeCodes.playerMode && (
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
        {panelMode.panel === PanelModeCodes.ratingMode && (
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
        {panelMode.panel === PanelModeCodes.topUserByClansMode && (
          <RatingClansPanel type={panelMode.panel} state={state} />
        )}
        {panelMode.panel === PanelModeCodes.taskRatingMode && (
          <TaskRankingPanel
            type={panelMode.panel}
            state={state}
            handleTaskSelectClick={handleTaskSelectClick}
          />
        )}
        {panelMode.panel === PanelModeCodes.clansBubbleDistributionMode && (
          <ClansChartPanel type={panelMode.panel} state={state} />
        )}
        {panelMode.panel === PanelModeCodes.taskRatingAdvanced && (
          <TaskRankingAdvancedPanel taskId={panelMode.taskId} state={state} />
        )}
      </div>
      {/*   </CSSTransition> */}
      {/* </SwitchTransition> */}
    </>
  );
}

export default memo(CustomTournamentInfoPanel);
