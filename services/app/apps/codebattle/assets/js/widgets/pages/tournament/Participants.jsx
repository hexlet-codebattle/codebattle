import React, { memo } from 'react';

import UserInfo from '../../components/UserInfo';
import JoinButton from './JoinButton';

import TournamentStates from '../../config/tournament';

const Participants = ({
  players, state, creatorId, currentUserId,
}) => (
  <div className="container mt-2 bg-white shadow-sm p-2">
    <div className="d-flex align-items-center flex-wrap justify-content-start">
      <h5 className="mb-2 mr-5">Participants</h5>
      <JoinButton
        isShow={state === TournamentStates.waitingParticipants}
        isParticipant={players.some(item => item.id === currentUserId)}
      />
    </div>
    <div className="my-3">
      {players.map(player => (
        <div className="my-3 d-flex" key={player.id}>
          <div className="d-flex align-items-center">
            <UserInfo user={player} />
            {creatorId === currentUserId && player.id !== currentUserId && (
              <button type="button" className="btn btn-outline-danger ml-2">
                Kick
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default memo(Participants);
