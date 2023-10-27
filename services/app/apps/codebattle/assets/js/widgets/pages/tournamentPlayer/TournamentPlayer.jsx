import React, { useState, useEffect, useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useInterpret } from '@xstate/react';
import cn from 'classnames';
import groupBy from 'lodash/groupBy';
import reverse from 'lodash/reverse';
import sum from 'lodash/sum';
import { useDispatch, useSelector } from 'react-redux';

import CountdownTimer from '@/components/CountdownTimer';
import { connectToEditor, connectToGame, updateGameChannel } from '@/middlewares/Game';

import EditorUserTypes from '../../config/editorUserTypes';
import GameStateCodes from '../../config/gameStateCodes';
import MatchStatesCodes from '../../config/matchStates';
import TournamentStates from '../../config/tournament';
import { connectToTournamentPlayer } from '../../middlewares/TournamentPlayer';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import Output from '../game/Output';
import OutputTab from '../game/OutputTab';
import TaskAssignment from '../game/TaskAssignment';

import SpectatorEditor from './SpectatorEditor';

const RoundStatus = ({ playerId, matches }) => {
  const finishedMatches = matches.filter(match => match.playerResults[playerId]);
  const matchesCount = finishedMatches.length;

  const opponentId = matches[0].playerIds.find(id => (id !== playerId));
  const playerWinMatches = matches.filter(match => playerId === match.winnerId);
  const opponentWinMatches = matches.filter(match => opponentId === match.winnerId);

  const playerScore = sum(finishedMatches.map(match => match.playerResults[playerId]?.score || 0));
  const opponnentScore = sum(finishedMatches.map(match => match.playerResults[opponentId]?.score || 0));

  const playerAvgTests = matchesCount !== 0 ? sum(finishedMatches.map(match => match.playerResults[playerId]?.resultPercent || 0)) / matchesCount : 0;
  const opponnentAvgTests = matchesCount !== 0 ? sum(finishedMatches.map(match => match.playerResults[opponentId]?.resultPercent || 0)) / matchesCount : 0;

  const playerAvgDuration = matchesCount !== 0 ? sum(finishedMatches.map(match => match.playerResults[playerId]?.durationSec || 0)) / matchesCount : 0;
  const opponnentAvgDuration = matchesCount !== 0 ? sum(finishedMatches.map(match => match.playerResults[opponentId]?.durationSec || 0)) / matchesCount : 0;

  const RoundStatistics = () => (
    <div className="d-flex text-center align-items-center">
      <div className="d-flex flex-column align-items-baseline">
        <span className="ml-2 h4">
          {'Wins: '}
          {playerWinMatches.length}
        </span>
        <span className="ml-2 h4">
          {'Score: '}
          {playerScore}
        </span>
        <span className="ml-2 h4">
          {`AVG Tests: ${playerAvgTests}%`}
        </span>
        <span className="ml-4 h4">
          {'AVG Duration: '}
          {playerAvgDuration}
          {' sec'}
        </span>
      </div>
    </div>
  );
  const RoundResultIcon = () => {
    if ((playerWinMatches.length === opponentWinMatches.length)
      && (playerScore === opponnentScore)
      && (playerAvgTests === opponnentAvgTests)
      && (playerAvgDuration === opponnentAvgDuration)
    ) {
      return <FontAwesomeIcon className="ml-2 text-primary" icon="handshake" />;
    }

    if (
      (playerWinMatches.length > opponentWinMatches.length)
      || (
        (playerWinMatches.length === opponentWinMatches.length)
        && (playerScore > opponnentScore)
      )
      || (
        (playerWinMatches.length === opponentWinMatches.length)
        && (playerScore === opponnentScore)
        && (playerAvgTests > opponnentAvgTests)
      )
      || ((playerWinMatches.length === opponentWinMatches.length)
        && (playerScore === opponnentScore)
        && (playerAvgTests === opponnentAvgTests)
        && (playerAvgDuration > opponnentAvgDuration)
      )
    ) {
      return <FontAwesomeIcon className="ml-2 text-warning" icon="trophy" />;
    }

    return <FontAwesomeIcon className="ml-2 text-secondary" icon="trophy" />;
  };

  return (
    <div className="d-flex">
      <RoundResultIcon />
      <RoundStatistics />
    </div>
  );
};

const getMatchIcon = (playerId, match) => {
  if (match.state === MatchStatesCodes.timeout || match.state === MatchStatesCodes.canceled) {
    return <FontAwesomeIcon className="text-dark" icon="stopwatch" />;
  }

  if (playerId === match.winnerId) {
    return <FontAwesomeIcon className="text-warning" icon="trophy" />;
  }

  if (playerId !== match.winnerId) {
    return <FontAwesomeIcon className="text-muted" icon="trophy" />;
  }

  return <FontAwesomeIcon className="text-danger" icon="times" />;
};

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

    const lastRound = rounds[0];

    if (!lastRound) {
      return (
        <div
          className="card bg-white rounded-lg flex justify-content-center align-items-center w-100 h-100"
        >
          No statistics
        </div>
      );
    }

    return (
      <div className="card border-0 rounded-lg shadow-sm h-100">
        <div className="p-2 d-flex flex-column justify-content-center align-items-center text-center h-100">
          <h1 className="mt-2">
            <RoundStatus
              playerId={playerId}
              matches={groupedMatches[lastRound]}
            />
          </h1>
          <div>
            {groupedMatches[lastRound].map(match => (
              <div className="d-flex text-center align-items-center" key={match.id}>
                <span className="h3">{getMatchIcon(playerId, match)}</span>
                {match.playerResults[playerId] ? (
                  <div className="d-flex flex-column align-items-baseline">
                    <span className="ml-4 h4">
                      {'Duration: '}
                      {match.playerResults[playerId].durationSec}
                      {' sec'}
                    </span>
                    <span className="ml-2 h4">
                      {'Score: '}
                      {match.playerResults[playerId].score}
                    </span>
                    <span className="ml-2 h4">
                      {`Tests: ${match.playerResults[playerId].resultPercent}%`}
                    </span>
                  </div>
                ) : (
                  <span className="ml-4 h3">¯\_(ツ)_/¯</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container-fluid d-flex flex-column min-vh-100">
        <div className={spectatorDisplayClassName} style={{ flex: '1 1 auto' }}>
          <div className="d-flex flex-column col-12 col-xl-4 col-lg-6 p-1">
            {GameStateCodes.playing === gameState ? <GamePanel /> : <MatchesPannel />}
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
