import React, {
 useState, useCallback, useEffect, useMemo,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import shuffle from 'lodash/shuffle';

import MatchStates from '../../config/matchStates';
import { createCustomRound } from '../../middlewares/Tournament';
import { tournamentEmptyPlayerUrl } from '../../utils/urlBuilders';

const emptyPlayer = {};

function TournamentGameCreatePanel({
  players,
  matches,
  taskList = [],
  currentRoundPosition,
  defaultMatchTimeoutSeconds,
}) {
  const [selectedPlayer, setSelectedPlayer] = useState(emptyPlayer);
  const [opponentPlayer, setOpponentPlayer] = useState(emptyPlayer);
  const [selectedTaskLevel, setSelectedTaskLevel] = useState();
  const [selectedTimeoutSeconds, setSelectedTimeoutSeconds] = useState();

  const activeMatch = useMemo(() => {
    if (!selectedPlayer) return null;

    const activeMatches = Object.values(matches)
      .filter(match => (
        match.roundPosition === currentRoundPosition
          && match.playerIds.includes(selectedPlayer.id)
          && match.state === MatchStates.playing
      ));

    if (activeMatches.length === 0) {
      return null;
    }
    return activeMatches[0];
  }, [selectedPlayer, matches, currentRoundPosition]);

  const availableTasks = useMemo(() => (
    taskList.reduce((acc, task) => {
      if (selectedPlayer && players[selectedPlayer.id]?.taskIds?.includes(task.id)) {
        return acc;
      }

      acc[task.level].push(task);

      return acc;
    }, {
      elementary: [],
      easy: [],
      medium: [],
      hard: [],
    })
  ), [selectedPlayer, players, taskList]);

  const clearSelectedPlayer = useCallback(() => {
    setSelectedPlayer();
    setOpponentPlayer();
    setSelectedTaskLevel();
  }, [setSelectedPlayer, setOpponentPlayer, setSelectedTaskLevel]);
  const clearSelectedTaskLevel = useCallback(() => {
    setSelectedTaskLevel();
  }, [setSelectedTaskLevel]);

  useEffect(() => {
    if (selectedPlayer === emptyPlayer) {
      const playersListWithoutBots = Object.values(players)
        .filter(player => !player.isBot);

      if (playersListWithoutBots.length === 1) {
        setSelectedPlayer(playersListWithoutBots[0]);
      } else if (playersListWithoutBots.length === 2) {
        setSelectedPlayer(playersListWithoutBots[0]);
        setOpponentPlayer(playersListWithoutBots[1]);
      }
    }
  }, [players, selectedPlayer]);

  return (
    <div className="d-flex justify-content-between w-100 flex-row border rounded-lg p-3 mb-2">
      {!selectedPlayer && (
        <>
          <img
            alt="Waiting opponent avatar"
            src={tournamentEmptyPlayerUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar bg-gray rounded p-3"
          />
          <div className="d-flex justify-content-between align-items-center flex-column">
            <select
              className="form-control custom-select rounded-lg m-1"
              onChange={e => setSelectedPlayer(players[e.target.value])}
            >
              <option disabled selected value>
                Choose player
              </option>
              {Object.values(players)
                .filter(player => !player.isBot)
                .map(player => (
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
              {'Choose task level for '}
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
                className="btn btn-sm btn-primary py-1 m-1 rounded-lg"
                onClick={() => setSelectedTaskLevel('elementary')}
                disabled={availableTasks.elementary.length < 1}
              >
                Elementary
                {' '}
                <span className="text-nowrap">
                  {`(${availableTasks.elementary.length} available)`}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary py-1 m-1 rounded-lg"
                onClick={() => setSelectedTaskLevel('easy')}
                disabled={availableTasks.easy.length < 1}
              >
                Easy
                {' '}
                {availableTasks.easy.length}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-warning py-1 m-1 rounded-lg"
                onClick={() => setSelectedTaskLevel('medium')}
                disabled={availableTasks.medium.length < 1}
              >
                Medium
                {' '}
                {availableTasks.medium.length}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger py-1 m-1 rounded-lg"
                onClick={() => setSelectedTaskLevel('hard')}
                disabled={availableTasks.hard.length < 1}
              >
                Hard
                {' '}
                {availableTasks.hard.length}
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
                src={selectedPlayer.avatarUrl}
                className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar rounded p-2"
              />
              {
                opponentPlayer && (
                  <>
                    vs
                    <img
                      alt={`${opponentPlayer.name} avatar`}
                      src={opponentPlayer?.avatarUrl}
                      className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar rounded p-2"
                    />
                  </>
                )
              }
            </div>
            <div className="d-flex flex-column justify-content-center">
              <span className="h6 p-1 text-nowrap">{`Player: ${selectedPlayer.name}`}</span>
              {opponentPlayer.name && (
                <span className="h6 p-1 text-nowrap">{`Opponent: ${opponentPlayer.name}`}</span>
              )}
              <div className="d-flex align-items-baseline px-1">
                <span className="h6 text-nowrap">
                  {`Level: ${selectedTaskLevel} (${availableTasks[selectedTaskLevel].length} available)`}
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={clearSelectedTaskLevel}
                >
                  <FontAwesomeIcon icon="pen" />
                </button>
              </div>
              <div className="d-flex align-items-baseline px-1">
                <input
                  id="round-seconds"
                  name="round-seconds"
                  type="number"
                  min="180"
                  max="7200"
                  step="60"
                  placeholder={defaultMatchTimeoutSeconds}
                  value={selectedTimeoutSeconds}
                  onChange={event => {
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
                <label htmlFor="round-seconds">
                  Match seconds
                </label>
              </div>
              {activeMatch ? (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary rounded-lg p-1 px-2"
                  disabled
                >
                  Round already started
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
                  Start round
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
