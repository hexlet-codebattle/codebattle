import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import UserInfo from '../../components/UserInfo';

const Players = ({
  playersCount,
  players,
  showBots,
}) => (
  <div className="bg-white shadow-sm p-3 rounded-lg overflow-auto">
    <div className="d-flex align-items-center flex-wrap justify-content-start">
      <h5 className="mb-2 mr-5 text-nowrap">
        {playersCount > 99 ? (
          <>
            <FontAwesomeIcon title="Total players" icon="users" />
            {`: ${playersCount}`}
          </>
        ) : (
          <>{`Total players: ${playersCount}`}</>
        )}
      </h5>
    </div>
    <div className="my-2">
      {playersCount === 0 ? (
        <p className="test-nowrap">NO_PARTICIPANTS_YET</p>
      ) : (
        Object.values(players)
          .filter(player => (showBots ? true : !player.isBot))
          .slice(0, 30).map(player => (
            <div key={player.id} className="my-3 d-flex">
              <div className="ml-1">
                <UserInfo user={player} hideOnlineIndicator />
              </div>
            </div>
          ))
      )}
    </div>
  </div>
);

export default memo(Players);
