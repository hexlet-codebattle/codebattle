import React, { useState, useEffect, useCallback } from 'react';

import { useInterpret } from '@xstate/react';
import cn from 'classnames';
import groupBy from 'lodash/groupBy';
import reverse from 'lodash/reverse';
import { useDispatch, useSelector } from 'react-redux';

import CountdownTimer from '@/components/CountdownTimer';
import { connectToEditor, connectToGame, updateGameChannel } from '@/middlewares/Game';

import EditorUserTypes from '../../config/editorUserTypes';
import GameStateCodes from '../../config/gameStateCodes';
import TournamentStates from '../../config/tournament';
import { connectToTournamentPlayer } from '../../middlewares/TournamentPlayer';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import Output from '../game/Output';
import OutputTab from '../game/OutputTab';
import TaskAssignment from '../game/TaskAssignment';

import SpectatorEditor from './SpectatorEditor';

const getSpectatorStatus = (state, task, gameId) => {
  switch (state) {
    case TournamentStates.finished:
      return 'Tournament is finished';
    case TournamentStates.waitingParticipants:
      return 'Tournament is waiting to start';
    case TournamentStates.cancelled:
      return 'Tournament is cancelled';
    default:
      break;
  }

  if (!task || !gameId) {
    return 'Game is loading';
  }

  return '';
};

function TournamentPlayer({
  spectatorMachine,
}) {
  const dispatch = useDispatch();

  const [switchedWidgetsStatus, setSwitchedWidgetsStatus] = useState(false);

  // const currentUserId = useSelector(selectors.currentUserIdSelector);
  const {
    startsAt,
    timeoutSeconds,
    state: gameState,
  } = useSelector(selectors.gameStatusSelector);
  const tournament = useSelector(selectors.tournamentSelector);
  const task = useSelector(selectors.gameTaskSelector);
  const taskLanguage = useSelector(selectors.taskDescriptionLanguageselector);
  const { playerId, gameId } = useSelector(
    state => state.tournamentPlayer,
  );
  const output = useSelector(selectors.executionOutputSelector(playerId));

  const spectatorStatus = getSpectatorStatus(tournament.state, task, gameId);
  // TODO: if there is not active_match set html, LOADING

  const context = { userId: playerId, type: EditorUserTypes.player };
  const spectatorService = useInterpret(spectatorMachine, {
    context,
    devTools: true,
    actions: {},
  });

  const handleSwitchWidgets = useCallback(() => setSwitchedWidgetsStatus(state => !state), [setSwitchedWidgetsStatus]);
  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  useEffect(() => {
    const clearConnection = connectToTournamentPlayer()(dispatch);

    return () => {
      clearConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateGameChannel(gameId);

    if (gameId) {
      const clearConnection = connectToGame(spectatorService)(dispatch);
      const clearEditor = connectToEditor(spectatorService)(dispatch);

      return () => {
        clearConnection();
        clearEditor();
      };
    }

    return () => { };
  }, [gameId, spectatorService, dispatch]);

  const spectatorDisplayClassName = cn('d-flex flex-column', {
    'flex-xl-row flex-lg-row': !switchedWidgetsStatus,
    'flex-xl-row-reverse flex-lg-row-reverse': switchedWidgetsStatus,
  });

  const spectatorGameStatusClassName = cn('d-flex justify-content-around align-items-center w-100 p-2', {
    'flex-row-reverse': switchedWidgetsStatus,
  });

  const GamePanel = () => (
    !spectatorStatus ? (
      <>
        <div>
          <TaskAssignment
            task={task}
            taskLanguage={taskLanguage}
            handleSetLanguage={handleSetLanguage}
            hideGuide
            hideContribution
          />
        </div>
        <div
          className="card border-0 shadow-sm h-50 mt-1"
          style={{ minHeight: '490px' }}
        >
          <div className={spectatorGameStatusClassName}>
            {GameStateCodes.playing !== gameState && (
              <h3>Game is Over</h3>
            )}
            {startsAt && gameState === GameStateCodes.playing && (
              <CountdownTimer time={startsAt} timeoutSeconds={timeoutSeconds} />
            )}
            <OutputTab sideOutput={output} large />
          </div>
          <div style={{ minHeight: '400px' }} className="position-relative overflow-auto w-100 h-100">
            <div className="position-absolute w-100">
              <Output sideOutput={output} />
            </div>
          </div>
        </div>
      </>
    ) : (
      <div className="card border-0 h-100 w-100">
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          {spectatorStatus}
        </div>
      </div>
    )
  );

  const MatchesPannel = () => {
    const groupedMatches = groupBy(Object.values(tournament.matches), 'round');
    const rounds = reverse(Object.keys(groupedMatches));
    return (
      <div>
        {rounds.map(round => (
          <div key={round}>
            <h4>
              {`Round ${Number(round) + 1}`}
            </h4>
            <div>
              {groupedMatches[round].map(match => (
                <div key={match.id}>
                  <span>{match.state}</span>
                  <span>{match.winnerId}</span>
                  {match.playerResults}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="container-fluid d-flex flex-column min-vh-100">
        <div className={spectatorDisplayClassName} style={{ flex: '1 1 auto' }}>
          <div className="d-flex flex-column col-12 col-xl-4 col-lg-6 p-1">
<<<<<<< Updated upstream
            {(GameStateCodes.playing === gameState) ? <GamePanel /> : <MatchesPannel />}
=======
            {!spectatorStatus ? (
              <>
                <div>
                  <TaskAssignment
                    task={task}
                    taskLanguage={taskLanguage}
                    handleSetLanguage={handleSetLanguage}
                    hideGuide
                    hideContribution
                  />
                </div>
                <div
                  className="card border-0 shadow-sm h-50 mt-1"
                  style={{ minHeight: '490px' }}
                >
                  <div className={spectatorGameStatusClassName}>
                    {GameStateCodes.playing !== gameState && (
                      <h3>Game over</h3>
                    )}
                    {startsAt && gameState === GameStateCodes.playing && (
                      <CountdownTimer time={startsAt} timeoutSeconds={timeoutSeconds} />
                    )}
                    <OutputTab sideOutput={output} large />
                  </div>
                  <div style={{ minHeight: '400px' }} className="position-relative overflow-auto w-100 h-100">
                    <div className="position-absolute w-100">
                      <Output sideOutput={output} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="card border-0 h-100 w-100">
                <div className="d-flex justify-content-center align-items-center w-100 h-100">
                  {spectatorStatus}
                </div>
              </div>
            )}
>>>>>>> Stashed changes
          </div>
          <SpectatorEditor
            switchedWidgetsStatus={switchedWidgetsStatus}
            handleSwitchWidgets={handleSwitchWidgets}
            spectatorService={spectatorService}
            playerId={playerId}
          />
        </div>
      </div>
    </>
  );
}

export default TournamentPlayer;
