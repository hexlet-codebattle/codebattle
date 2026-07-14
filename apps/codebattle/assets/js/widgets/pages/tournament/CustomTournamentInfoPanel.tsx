import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { useSelector } from 'react-redux';

// import { CSSTransition, SwitchTransition } from 'react-transition-group';
import TournamentStates from '../../config/tournament';
import { currentUserIsAdminSelector, tournamentPlayersSelector } from '../../selectors';

import ClansChartPanel from './ClansChartPanel';
import CheatersPanel from './CheatersPanel';
import ControlPanel, { PanelModeCodes } from './ControlPanel';
import LeaderboardPanel from './LeaderboardPanel';
import PlayersMatchesPanel from './PlayersMatchesPanel';
import PlayerStatsPanel from './PlayerStatsPanel';
import RatingClansPanel from './RatingClansPanel';
import ReportsPanel from './ReportsPanel';
import StatisticsCard from './StatisticsCard';
import TaskRankingAdvancedPanel from './TaskRankingAdvancedPanel';
import TaskRankingPanel from './TaskRankingPanel';
import TournamentGameCreatePanel from './TournamentGameCreatePanel';

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

const replacePanelHash = (panel: string) => {
  const nextHash = `#${panel}`;

  if (window.location.hash === nextHash) {
    return;
  }

  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${nextHash}`,
  );
};

interface InfoPanelMode {
  panel: string;
  userId?: number;
  taskId?: number;
}

interface InfoPanelPlayer {
  id: number;
  name?: string;
  [key: string]: unknown;
}

interface CustomTournamentInfoPanelProps {
  canModerate?: boolean;
  currentRoundPosition?: number;
  currentUserId: number;
  hideBots?: boolean;
  hideCustomGameConsole?: boolean;
  hideResults?: boolean;
  matchTimeoutSeconds?: number;
  matches: Record<number, { playerIds: number[]; [key: string]: unknown }>;
  pageNumber: number;
  pageSize: number;
  players: Record<number, InfoPanelPlayer>;
  playersCount: number;
  playersRedirectUrl?: string;
  ranking?: { entries?: unknown[]; [key: string]: unknown };
  roundsLimit?: number;
  state: string;
  taskList?: unknown[];
  topPlayerIds?: number[];
  type?: string;
}

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
  playersRedirectUrl,
  ranking,
  roundsLimit = 1,
  state,
  taskList,
  topPlayerIds,
  type,
}: CustomTournamentInfoPanelProps) {
  const getDefaultPanelMode = useCallback(() => {
    if (state === TournamentStates.finished) {
      return { panel: PanelModeCodes.leaderboardMode };
    }
    if (players[currentUserId]) {
      return { panel: PanelModeCodes.playerMode };
    }

    return { panel: PanelModeCodes.ratingMode };
  }, [state, players, currentUserId]);

  const infoPanelRef = useRef<HTMLDivElement>(null);
  const [searchedUser, setSearchedUser] = useState<InfoPanelPlayer | undefined>();
  const [panelHistory, setPanelHistory] = useState<InfoPanelMode[]>([]);
  const [panelMode, setPanelMode] = useState<InfoPanelMode>(getDefaultPanelMode);
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
    (event: React.MouseEvent | React.KeyboardEvent) => {
      const { userId, userName } = (event.currentTarget as HTMLElement).dataset;
      setPanelMode({
        panel: PanelModeCodes.ratingMode,
        userId: Number(userId),
      });
      setPanelHistory((items) => [...items, panelMode]);
      setSearchedUser(
        (allPlayers[Number(userId)] as InfoPanelPlayer) || { id: Number(userId), name: userName },
      );
    },
    [panelMode, setPanelMode, setPanelHistory, setSearchedUser, allPlayers],
  );
  const handleTaskSelectClick = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      const { taskId } = (event.currentTarget as HTMLElement).dataset;
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
    const panel = window.location.hash.replace(/^#/, '');

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
    window.addEventListener('hashchange', syncPanelModeFromHash);

    return () => {
      window.removeEventListener('hashchange', syncPanelModeFromHash);
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
          players={players as React.ComponentProps<typeof TournamentGameCreatePanel>['players']}
          matches={matches as React.ComponentProps<typeof TournamentGameCreatePanel>['matches']}
          taskList={taskList as React.ComponentProps<typeof TournamentGameCreatePanel>['taskList']}
          currentRoundPosition={currentRoundPosition ?? 0}
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
                matchList={
                  Object.values(matches).filter((match) =>
                    match.playerIds.includes(currentUserId),
                  ) as unknown as React.ComponentProps<typeof StatisticsCard>['matchList']
                }
                compact
              />
            ) : null
          }
          panelMode={panelMode}
          setPanelMode={setPanelMode}
          allowedPanelModes={allowedPanelModes}
        />
        {panelMode.panel === PanelModeCodes.leaderboardMode && (
          <LeaderboardPanel
            canModerate={canModerate}
            state={state}
            ranking={ranking as React.ComponentProps<typeof LeaderboardPanel>['ranking']}
            playersCount={playersCount}
          />
        )}
        {panelMode.panel === PanelModeCodes.playerMode && (
          <PlayerStatsPanel
            currentRoundPosition={currentRoundPosition ?? 0}
            roundsLimit={roundsLimit}
            matches={matches as React.ComponentProps<typeof PlayerStatsPanel>['matches']}
            players={players as React.ComponentProps<typeof PlayerStatsPanel>['players']}
            type={type}
            currentUserId={currentUserId}
            hideBots={hideBots}
            canModerate={canModerate}
            playersRedirectUrl={playersRedirectUrl}
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
            currentRoundPosition={currentRoundPosition}
            playersCount={playersCount}
            playersRedirectUrl={playersRedirectUrl}
            pageNumber={pageNumber}
            pageSize={pageSize}
            hideBots={hideBots}
            canModerate={canModerate}
            hideResults={(hideResults && !canModerate) || (!players[currentUserId] && !canModerate)}
            type={type}
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
            taskId={panelMode.taskId ?? 0}
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
