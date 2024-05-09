import React, {
    useCallback,
  useContext,
} from 'react';

import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import { pauseWaitingRoomMatchmaking, startWaitingRoomMatchmaking } from '@/middlewares/Room';

import RoomContext from '../../components/RoomContext';
import {
  isWaitingRoomActiveSelector,
  isMatchmakingPausedSelector,
  isPlayerBannedSelector,
  isPlayerIdleSelector,
} from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import Notifications from './Notifications';

const WaitingRoomPanel = ({ taskCount, maxPlayerTasks }) => {
  const dispatch = useDispatch();

  const { waitingRoomService } = useContext(RoomContext);

  const isWaitingRoomActive = useMachineStateSelector(
    waitingRoomService,
    isWaitingRoomActiveSelector,
  );
  const isMatchmakingPaused = useMachineStateSelector(
    waitingRoomService,
    isMatchmakingPausedSelector,
  );
  const isMatchmakingInProgress = useMachineStateSelector(
    waitingRoomService,
    isMatchmakingPausedSelector,
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

  return (
    <div
      className="flex-shrink-1 border-left rounded-right cb-game-control-container p-3"
    >
      {isWaitingRoomActive ? (
        <div className="d-flex flex-column align-items-center">
          {isMatchmakingPaused && (
            <>
              <img
                src="/assets/images/event/stars.png"
                alt="Matchmaking is paused"
                className="my-2"
              />
              <span className="mb-2 text-center px-3">
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
              <img
                src="/assets/images/event/cherry.png"
                alt="Matchmaking in progress"
                className="my-2"
              />
              <span className="mb-2 text-center px-3">
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
          {isBannedPlayer && (
            <></>
          )}
          {isMatchmakingStopped && (
            <>
              <img
                src="/assets/images/event/trophy.png"
                alt="Player status"
                className="my-2"
              />
              <span className="mb-2 text-center px-3">
                {maxPlayerTasks - taskCount > 0 ? (
                  i18next.t('arena_task_stats', {
                    count: maxPlayerTasks - taskCount,
                  })
                ) : (
                  i18next.t('Congrats! All tasks are solved')
                )}
              </span>
              <button
                type="button"
                className="btn cb-custom-event-btn-outline-success rounded-lg"
                disabled
              >
                {i18next.t('Stop searching')}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="px-3 py-3 w-100 d-flex flex-column">
          <Notifications />
        </div>
      )}
    </div>
  );
};

export default WaitingRoomPanel;
