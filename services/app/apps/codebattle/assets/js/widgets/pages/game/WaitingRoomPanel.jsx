import React, { useContext } from 'react';

import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { gameIdSelector } from '@/selectors';

import RoomContext from '../../components/RoomContext';
import { isWaitingRoomActiveSelector } from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import BackToTournamentButton from './BackToTournamentButton';
import Notifications from './Notifications';

const WaitingRoomPanel = ({ children }) => {
  const gameId = useSelector(gameIdSelector);
  const activeGameId = useSelector(
    state => state.tournamentPlayer.gameId,
  );

  const { waitingRoomService } = useContext(RoomContext);

  const isWaitingRoomActive = useMachineStateSelector(
    waitingRoomService,
    isWaitingRoomActiveSelector,
  );

  return (
    <div className="flex-shrink-1 border-left rounded-right cb-game-control-container p-3">
      {isWaitingRoomActive ? (
        <div className="d-flex flex-column align-items-center">
          {children}
          <div className="mt-2">
            {activeGameId && gameId !== activeGameId && (
              <a
                type="button"
                className="btn btn-secondary rounded-lg mb-1"
                href={`/games/${activeGameId}`}
              >
                {i18next.t('Go to active game')}
              </a>
            )}
            <BackToTournamentButton />
          </div>
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
