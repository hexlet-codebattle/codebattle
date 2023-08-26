import React, { memo } from 'react';

import UserInfo from '../../components/UserInfo';

const Players = ({
  players,
  playersCount,
  canBan,
  handleKick,
}) => (
  <div className="my-2 bg-white shadow-sm p-3 rounded-lg">
    <div className="d-flex align-items-center flex-wrap justify-content-start">
      <h5 className="mb-2 mr-5 text-nowrap">{`Total players: ${playersCount}`}</h5>
    </div>
    <div className="my-2">
      {playersCount === 0 ? (
        <p className="test-nowrap">NO_PARTICIPANTS_YET</p>
      ) : (
        Object.values(players).map((player, index) => (
          <div key={player.id} className="my-3 d-flex">
            <span>{index}</span>
            <div className="ml-4">
              <UserInfo user={player} />
            </div>
            {canBan && (
              <button
                type="button"
                className="btn btn-link btn-sm text-danger"
                data-player-id={player.id}
                onClick={handleKick}
              >
                Kick
              </button>
            )}
          </div>
        ))
      )}
    </div>
  </div>
);

export default memo(Players);
