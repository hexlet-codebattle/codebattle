import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useSelector } from "react-redux";

// import { CSSTransition, SwitchTransition } from 'react-transition-group';
import TournamentStates from "../../config/tournament";
import { currentUserIsAdminSelector, tournamentPlayersSelector } from "../../selectors";

import ClansChartPanel from "./ClansChartPanel";
import CheatersPanel from "./CheatersPanel";
import ControlPanel, { PanelModeCodes } from "./ControlPanel";
import LeaderboardPanel from "./LeaderboardPanel";
import PlayersMatchesPanel from "./PlayersMatchesPanel";
import PlayerStatsPanel from "./PlayerStatsPanel";
import RatingClansPanel from "./RatingClansPanel";
import ReportsPanel from "./ReportsPanel";
import StatisticsCard from "./StatisticsCard";
import TaskRankingAdvancedPanel from "./TaskRankingAdvancedPanel";
import TaskRankingPanel from "./TaskRankingPanel";
import TournamentGameCreatePanel from "./TournamentGameCreatePanel";

const basePanelModes = [PanelModeCodes.playerMode, PanelModeCodes.leaderboardMode];
const finishedPanelModes = [
  ...basePanelModes,
  PanelModeCodes.topUserByClansMode,
  PanelModeCodes.taskRatingMode,
  PanelModeCodes.clansBubbleDistributionMode,
  PanelModeCodes.taskRatingAdvanced,
  PanelModeCodes.taskDurationDistributionMode,
  PanelModeCodes.topUserByTasksMode,
];

const replacePanelHash = (panel) => {
  const nextHash = `#${panel}`;

  if (window.location.hash === nextHash) {
    return;
  }

  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${nextHash}`,
  );
};

function CustomTournamentInfoPanel({
  canModerate = false,
  currentRoundPosition = 0,
  currentUserId,
  hideBots = false,
  hideCustomGameConsole = false,
  hideResults = false,
  matchTimeoutSeconds,
  matches,
  pageNumber,
  pageSize,
  players,
  playersCount,
  ranking,
  roundsLimit = 1,
  state,
  taskList,
  topPlayerIds,
  type,
}) {
  const getDefaultPanelMode = useCallback(() => {
    if (state === TournamentStates.finished) {
      return { panel: PanelModeCodes.leaderboardMode };
    }
    if (players[currentUserId]) {
      return { panel: PanelModeCodes.playerMode };
    }

    return { panel: PanelModeCodes.ratingMode };
  }, [state, players, currentUserId]);

  const infoPanelRef = useRef();
  const [searchedUser, setSearchedUser] = useState();
  const [panelHistory, setPanelHistory] = useState([]);
  const [panelMode, setPanelMode] = useState(getDefaultPanelMode);
  // eslint-disable-next-line no-nested-ternary

  useEffect(() => {
    if (players[currentUserId]) {
      setPanelMode(getDefaultPanelMode);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players[currentUserId]?.id]);

  const allPlayers = useSelector(tournamentPlayersSelector);
  const isAdmin = useSelector(currentUserIsAdminSelector);

  const handleUserSelectClick = useCallback(
    (event) => {
      const { userId, userName } = event.currentTarget.dataset;
      setPanelMode({
        panel: PanelModeCodes.ratingMode,
        userId: Number(userId),
      });
      setPanelHistory((items) => [...items, panelMode]);
      setSearchedUser(allPlayers[Number(userId)] || { id: Number(userId), name: userName });
    },
    [panelMode, setPanelMode, setPanelHistory, setSearchedUser, allPlayers],
  );
  const handleTaskSelectClick = useCallback(
    (event) => {
      const { taskId } = event.currentTarget.dataset;
      setPanelMode({
        panel: PanelModeCodes.taskRatingAdvanced,
        taskId: Number(taskId),
      });
      setPanelHistory((items) => [...items, panelMode]);
    },
    [panelMode, setPanelMode, setPanelHistory],
  );

  // useEffect(() => {
  //   if (infoPanelRef.current?.style) {
  //     infoPanelRef.current.style.zoom = '140%';
  //   }
  // }, [infoPanelRef.current?.style]);

  const allowedPanelModes = useMemo(() => {
    if (canModerate) {
      return isAdmin
        ? Object.values(PanelModeCodes)
        : Object.values(PanelModeCodes).filter(
            (mode) => ![PanelModeCodes.reportsMode, PanelModeCodes.cheatersMode].includes(mode),
          );
    }

    if (state === TournamentStates.finished) {
      return finishedPanelModes;
    }

    return basePanelModes;
  }, [canModerate, isAdmin, state]);

  const getPanelModeFromHash = useCallback(() => {
    const panel = window.location.hash.replace(/^#/, "");

    if (allowedPanelModes.includes(panel)) {
      return { panel };
    }

    return getDefaultPanelMode();
  }, [allowedPanelModes, getDefaultPanelMode]);

  useEffect(() => {
    const syncPanelModeFromHash = () => {
      const nextPanelMode = getPanelModeFromHash();

      setPanelMode((currentPanelMode) => {
        if (currentPanelMode.panel === nextPanelMode.panel) {
          return currentPanelMode;
        }

        return nextPanelMode;
      });

      replacePanelHash(nextPanelMode.panel);
    };

    syncPanelModeFromHash();
    window.addEventListener("hashchange", syncPanelModeFromHash);

    return () => {
      window.removeEventListener("hashchange", syncPanelModeFromHash);
    };
  }, [getPanelModeFromHash]);

  useEffect(() => {
    if (!allowedPanelModes.includes(panelMode.panel)) {
      const nextPanelMode = getDefaultPanelMode();
      setPanelMode(nextPanelMode);
      replacePanelHash(nextPanelMode.panel);
      return;
    }

    replacePanelHash(panelMode.panel);
  }, [panelMode.panel, allowedPanelModes, getDefaultPanelMode]);

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
      <div ref={infoPanelRef}>
        <ControlPanel
          isPlayer={!!players[currentUserId]}
          leftContent={
            panelMode.panel === PanelModeCodes.playerMode ? (
              <StatisticsCard
                playerId={currentUserId}
                matchList={Object.values(matches).filter((match) =>
                  match.playerIds.includes(currentUserId),
                )}
                compact
              />
            ) : null
          }
          panelMode={panelMode}
          setPanelMode={setPanelMode}
          allowedPanelModes={allowedPanelModes}
        />
        {panelMode.panel === PanelModeCodes.leaderboardMode && (
          <LeaderboardPanel state={state} ranking={ranking} playersCount={playersCount} />
        )}
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
          <PlayersMatchesPanel
            searchedUser={searchedUser}
            roundsLimit={roundsLimit}
            matches={matches}
            players={players}
            topPlayerIds={topPlayerIds}
            currentUserId={currentUserId}
            playersCount={playersCount}
            pageNumber={pageNumber}
            pageSize={pageSize}
            hideBots={hideBots}
            canModerate={canModerate}
            hideResults={(hideResults && !canModerate) || (!players[currentUserId] && !canModerate)}
          />
        )}
        {panelMode.panel === PanelModeCodes.topUserByClansMode && (
          <RatingClansPanel
            type={panelMode.panel}
            state={state}
            handleUserSelectClick={handleUserSelectClick}
          />
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
          <TaskRankingAdvancedPanel
            taskId={panelMode.taskId}
            state={state}
            handleUserSelectClick={handleUserSelectClick}
          />
        )}
        {panelMode.panel === PanelModeCodes.reportsMode && <ReportsPanel />}
        {panelMode.panel === PanelModeCodes.cheatersMode && (
          <CheatersPanel canModerate={canModerate && isAdmin} />
        )}
      </div>
      {/*   </CSSTransition> */}
      {/* </SwitchTransition> */}
    </>
  );
}

export default memo(CustomTournamentInfoPanel);
