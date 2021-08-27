import React, { memo } from 'react';
import Gon from 'gon';
import UserInfo from './UserInfo';

import { leaveTournament, joinTournament } from '../middlewares/Tournament';
import TournamentStates from '../config/tournament';

const currentUser = Gon.getAsset('current_user');
const { id } = currentUser;

const JoinButton = ({ isShow, isParticipant, leave, join }) => {
      if (!isShow) {
        return null;
      }

      const onClick = isParticipant ? leave : join;
      const text = isParticipant ? 'Leave' : 'Join';

      return (
        <button type="button" className={`btn ${isParticipant ? 'btn-outline-danger' : 'btn-outline-secondary'}`}>{text}</button>
      );
};

const Participants = props => {
  const { players, state, creatorId } = props;

  return (
    <div className="container mt-2 bg-white shadow-sm p-2">
      <div className="d-flex align-items-center flex-wrap justify-content-start">
        <h5 className="mb-2 mr-5">Participants</h5>
        <JoinButton
          isShow={state === TournamentStates.waitingParticipants}
          isParticipant={players.some(item => item.id === id)}
          leave={leaveTournament}
          join={joinTournament}
        />
      </div>
      <div className="my-3">
        {players.map(player => (
          <div className="my-3 d-flex" key={player.id}>
            <div className="d-flex align-items-center">
              <UserInfo user={player} />
              {creatorId === id && isShow && (
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
};

export default memo(Participants);
