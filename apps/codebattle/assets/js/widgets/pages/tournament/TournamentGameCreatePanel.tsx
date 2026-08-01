import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import shuffle from 'lodash/shuffle';

import i18n from '../../../i18n';
import MatchStates from '../../config/matchStates';
import { createCustomRound } from '../../middlewares/TournamentAdmin';
import {
  getCustomEventPlayerDefaultImgUrl,
  tournamentEmptyPlayerUrl,
} from '../../utils/urlBuilders';

interface GamePlayer {
  id: number;
  name: string;
  isBot?: boolean;
  avatarUrl?: string;
  taskIds?: number[];
  [key: string]: unknown;
}

interface GameTask {
  id: number;
  level: 'elementary' | 'easy' | 'medium' | 'hard';
  [key: string]: unknown;
}

interface GameMatch {
  roundPosition: number;
  playerIds: number[];
  state: string;
  [key: string]: unknown;
}

interface TournamentGameCreatePanelProps {
  type?: string;
  players: Record<number, GamePlayer>;
  matches: Record<number, GameMatch>;
  taskList?: GameTask[];
  currentRoundPosition: number;
  defaultMatchTimeoutSeconds?: number;
}

const emptyPlayer: GamePlayer | Record<string, never> = {};

function TournamentGameCreatePanel({
  players,
  matches,
  taskList = [],
  currentRoundPosition,
  defaultMatchTimeoutSeconds,
}: TournamentGameCreatePanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | undefined>(
    emptyPlayer as GamePlayer,
  );
  const [opponentPlayer, setOpponentPlayer] = useState<GamePlayer | undefined>(
    emptyPlayer as GamePlayer,
  );
  const [selectedTaskLevel, setSelectedTaskLevel] = useState<
    'elementary' | 'easy' | 'medium' | 'hard' | undefined
  >();
  const [selectedTimeoutSeconds, setSelectedTimeoutSeconds] = useState<number | undefined>();

  const activeMatch = useMemo(() => {
    if (!selectedPlayer) return null;

    const activeMatches = Object.values(matches).filter(
      (match) =>
        match.roundPosition === currentRoundPosition &&
        match.playerIds.includes(selectedPlayer.id) &&
        match.state === MatchStates.playing,
    );

    if (activeMatches.length === 0) {
      return null;
    }
    return activeMatches[0];
  }, [selectedPlayer, matches, currentRoundPosition]);

  const availableTasks = useMemo(
    () =>
      taskList.reduce<Record<GameTask['level'], GameTask[]>>(
        (acc, task) => {
          if (selectedPlayer && players[selectedPlayer.id]?.taskIds?.includes(task.id)) {
            return acc;
          }

          acc[task.level].push(task);

          return acc;
        },
        {
          elementary: [],
          easy: [],
          medium: [],
          hard: [],
        },
      ),
    [selectedPlayer, players, taskList],
  );

  const clearSelectedPlayer = useCallback(() => {
    setSelectedPlayer(undefined);
    setOpponentPlayer(undefined);
    setSelectedTaskLevel(undefined);
  }, [setSelectedPlayer, setOpponentPlayer, setSelectedTaskLevel]);
  const clearSelectedTaskLevel = useCallback(() => {
    setSelectedTaskLevel(undefined);
  }, [setSelectedTaskLevel]);

  useEffect(() => {
    if (selectedPlayer === emptyPlayer) {
      const playersListWithoutBots = Object.values(players).filter((player) => !player.isBot);

      if (playersListWithoutBots.length === 1) {
        setSelectedPlayer(playersListWithoutBots[0]);
      } else if (playersListWithoutBots.length === 2) {
        setSelectedPlayer(playersListWithoutBots[0]);
        setOpponentPlayer(playersListWithoutBots[1]);
      }
    }
  }, [players, selectedPlayer]);

  return (
    <div className="d-flex justify-content-between w-100 flex-row border cb-rounded cb-border-color p-3 mb-2">
      {!selectedPlayer && (
        <>
          <img
            alt={i18n.t('Waiting opponent avatar')}
            src={tournamentEmptyPlayerUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar bg-gray cb-rounded p-3"
          />
          <div className="d-flex justify-content-between align-items-center flex-column">
            <select
              className="form-control custom-select cb-rounded m-1"
              onChange={(e) => setSelectedPlayer(players[Number(e.target.value)])}
            >
              <option disabled selected value="">
                {i18n.t('Choose player')}
              </option>
              {Object.values(players)
                .filter((player) => !player.isBot)
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
            </select>
          </div>
        </>
      )}
      {selectedPlayer && !selectedTaskLevel && (
        <>
          <div className="d-flex flex-column align-items-baseline flex-nowrap">
            <span className="h5">
              {i18n.t('Choose task level for')}{' '}
              <span className="text-nowrap">{selectedPlayer.name}</span>
              {opponentPlayer?.name && (
                <>
                  <span className="mx-2">vs</span>
                  <span className="text-nowrap">{opponentPlayer.name}</span>
                </>
              )}
              :
            </span>
            <div className="d-flex justify-content-begin flex-column flex-sm-row w-auto w-sm-50 button-group">
              <button
                type="button"
                className="btn btn-sm btn-secondary cb-btn-secondary py-1 m-1 cb-rounded"
                onClick={() => setSelectedTaskLevel('elementary')}
                disabled={availableTasks.elementary.length < 1}
              >
                {i18n.t('Elementary')}{' '}
                <span className="text-nowrap">
                  {i18n.t('(%{count} available)', {
                    count: availableTasks.elementary.length,
                  })}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary cb-btn-secondary py-1 m-1 cb-rounded"
                onClick={() => setSelectedTaskLevel('easy')}
                disabled={availableTasks.easy.length < 1}
              >
                {i18n.t('Easy')} {availableTasks.easy.length}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-warning py-1 m-1 cb-rounded"
                onClick={() => setSelectedTaskLevel('medium')}
                disabled={availableTasks.medium.length < 1}
              >
                {i18n.t('Medium')} {availableTasks.medium.length}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger py-1 m-1 cb-rounded"
                onClick={() => setSelectedTaskLevel('hard')}
                disabled={availableTasks.hard.length < 1}
              >
                {i18n.t('Hard')} {availableTasks.hard.length}
              </button>
            </div>
          </div>
          <div>
            <button className="btn btn-sm" type="button" onClick={clearSelectedPlayer} disabled>
              <FontAwesomeIcon icon="times" />
            </button>
          </div>
        </>
      )}
      {selectedPlayer && selectedTaskLevel && (
        <>
          <div className="d-flex w-100">
            <div className="d-flex flex-column align-items-center pr-1">
              <img
                alt={`${selectedPlayer.name} avatar`}
                src={selectedPlayer.avatarUrl || getCustomEventPlayerDefaultImgUrl(selectedPlayer)}
                className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar cb-rounded p-2"
              />
              {opponentPlayer && (
                <>
                  vs
                  <img
                    alt={`${opponentPlayer.name} avatar`}
                    src={
                      opponentPlayer.avatarUrl ||
                      getCustomEventPlayerDefaultImgUrl(opponentPlayer) ||
                      tournamentEmptyPlayerUrl
                    }
                    className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar rounded p-2"
                  />
                </>
              )}
            </div>
            <div className="d-flex flex-column justify-content-center">
              <span className="h6 p-1 text-nowrap">
                {i18n.t('Player: %{name}', { name: selectedPlayer.name })}
              </span>
              {opponentPlayer?.name && (
                <span className="h6 p-1 text-nowrap">
                  {i18n.t('Opponent: %{name}', { name: opponentPlayer.name })}
                </span>
              )}
              <div className="d-flex align-items-baseline px-1">
                <span className="h6 text-nowrap">
                  {i18n.t('Level: %{level} (%{count} available)', {
                    level: i18n.t(selectedTaskLevel),
                    count: availableTasks[selectedTaskLevel].length,
                  })}
                </span>
                <button type="button" className="btn btn-sm" onClick={clearSelectedTaskLevel}>
                  <FontAwesomeIcon icon="pen" />
                </button>
              </div>
              <div className="d-flex align-items-baseline px-1">
                <input
                  id="round-seconds"
                  name="round-seconds"
                  aria-label={i18n.t('Round timeout seconds')}
                  type="number"
                  min="180"
                  max="7200"
                  step="60"
                  placeholder={
                    defaultMatchTimeoutSeconds === undefined
                      ? undefined
                      : String(defaultMatchTimeoutSeconds)
                  }
                  value={selectedTimeoutSeconds ?? ''}
                  onChange={(event) => {
                    const newTimeout = Number(event.target.value);

                    if (newTimeout >= 180 && newTimeout <= 7200) {
                      setSelectedTimeoutSeconds(Number(event.target.value));
                    } else if (newTimeout <= 180) {
                      setSelectedTimeoutSeconds(180);
                    } else if (newTimeout >= 7200) {
                      setSelectedTimeoutSeconds(7200);
                    }
                  }}
                  className="my-1 mr-1"
                />
                <label htmlFor="round-seconds">{i18n.t('Match seconds')}</label>
              </div>
              {activeMatch ? (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary rounded-lg p-1 px-2"
                  disabled
                >
                  {i18n.t('Round already started')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary rounded-lg p-1"
                  onClick={() => {
                    createCustomRound({
                      task_id: shuffle(availableTasks[selectedTaskLevel])[0]?.id,
                      timeout_seconds: selectedTimeoutSeconds,
                    });
                  }}
                  disabled={availableTasks[selectedTaskLevel].length < 1}
                >
                  <FontAwesomeIcon className="mr-2" icon="play" />
                  {i18n.t('Start round')}
                </button>
              )}
            </div>
          </div>
          <div>
            <button className="btn btn-sm" type="button" onClick={clearSelectedPlayer} disabled>
              <FontAwesomeIcon icon="times" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TournamentGameCreatePanel;
