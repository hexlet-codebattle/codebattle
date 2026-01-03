import React, { useCallback, useContext, memo } from 'react';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import {
  pauseWaitingRoomMatchmaking,
  startWaitingRoomMatchmaking,
  restartWaitingRoomMatchmaking,
} from '@/middlewares/WaitingRoom';

import TournamentStates from '../config/tournament';
import {
  isMatchmakingInProgressSelector,
  isMatchmakingPausedSelector,
  isPlayerBannedSelector,
  isPlayerIdleSelector,
} from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';

import RoomContext from './RoomContext';

function WaitingRoomStatus({
  page,
  taskCount,
  breakState,
  tournamentState,
  maxPlayerTasks,
  activeGameId,
}) {
  const dispatch = useDispatch();

  const { waitingRoomService } = useContext(RoomContext);

  const showIcon = page === 'game';
  const statusTextClassName = cn({
    'mb-2 text-center px-3': page === 'game',
    'text-center px-2': page === 'tournament',
  });

  const isMatchmakingPaused = useMachineStateSelector(
    waitingRoomService,
    isMatchmakingPausedSelector,
  );
  const isMatchmakingInProgress = useMachineStateSelector(
    waitingRoomService,
    isMatchmakingInProgressSelector,
  );
  const isBannedPlayer = useMachineStateSelector(
    waitingRoomService,
    isPlayerBannedSelector,
  );
  const isMatchmakingStopped = useMachineStateSelector(
    waitingRoomService,
    isPlayerIdleSelector,
  );

  const handleStartMatchmaking = useCallback(() => {
    dispatch(startWaitingRoomMatchmaking());
  }, [dispatch]);

  const handlePauseMatchmaking = useCallback(() => {
    dispatch(pauseWaitingRoomMatchmaking());
  }, [dispatch]);

  const handleRestartMatchmaking = useCallback(() => {
    dispatch(restartWaitingRoomMatchmaking());
  }, [dispatch]);

  if (breakState === 'on' || tournamentState !== TournamentStates.active) {
    return (
      <>
        <img
          src="/assets/images/event/stars.png"
          alt="Matchmaking is paused"
          className="my-2"
        />
        <span className={statusTextClassName}>
          {i18next.t('Tournament is paused')}
        </span>
      </>
    );
  }

  return (
    <>
      {isMatchmakingPaused && (
        <>
          {showIcon && (
            <img
              src="/assets/images/event/stars.png"
              alt="Matchmaking is paused"
              className="my-2"
            />
          )}
          <span className={statusTextClassName}>
            {i18next.t('arena_task_stats', {
              count: maxPlayerTasks - taskCount,
            })}
          </span>
          <button
            type="button"
            className="btn cb-custom-event-btn-outline-success rounded-lg"
            onClick={handleStartMatchmaking}
          >
            {i18next.t('Search opponent')}
          </button>
        </>
      )}
      {isMatchmakingInProgress && (
        <>
          {showIcon && (
            <img
              src="/assets/images/event/cherry.png"
              alt="Matchmaking in progress"
              className="my-2"
            />
          )}
          <span className={statusTextClassName}>
            {i18next.t('Searching opponent')}
          </span>
          <button
            type="button"
            className="btn cb-custom-event-btn-outline-warning rounded-lg"
            onClick={handlePauseMatchmaking}
          >
            {i18next.t('Stop searching')}
          </button>
        </>
      )}
      {isBannedPlayer && <></>}
      {isMatchmakingStopped && (
        <>
          {showIcon && (
            <img
              src="/assets/images/event/trophy.png"
              alt="Player status"
              className="my-2"
            />
          )}
          <span className={statusTextClassName}>
            {maxPlayerTasks - taskCount > 0
              ? i18next.t('arena_task_stats', {
                count: maxPlayerTasks - taskCount,
              })
              : i18next.t('Congrats! All tasks are solved')}
          </span>
          {!activeGameId && maxPlayerTasks - taskCount > 0 ? (
            <button
              type="button"
              className="btn cb-custom-event-btn-outline-success rounded-lg"
              onClick={handleRestartMatchmaking}
            >
              {i18next.t('Restart searching')}
            </button>
          ) : (
            <button
              type="button"
              className="btn cb-custom-event-btn-outline-success rounded-lg"
              disabled
            >
              {i18next.t('Stop searching')}
            </button>
          )}
        </>
      )}
    </>
  );
}

export default memo(WaitingRoomStatus);
