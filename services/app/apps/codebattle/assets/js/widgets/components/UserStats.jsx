import React from 'react';

import LanguageIcon from './LanguageIcon';
import Loading from './Loading';
import UserAchievements from './UserAchievements';

const UserStats = ({ data, user: userInfo }) => {
  const avatarUrl = userInfo.avatarUrl || data?.user?.avatarUrl || '/assets/images/logo.svg';
  const name = userInfo.name || data?.user?.name || 'Jon Doe';
  const lang = userInfo.lang || data?.user?.lang || 'js';
  return (
    <div className="container-fluid p-2">
      <div className="row">
        <div className="col d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <img
              className="img-fluid rounded-lg"
              style={{ maxHeight: '40px', width: '40px' }}
              src={avatarUrl}
              alt="User avatar"
            />
            <div className="d-flex flex-column ml-2">
              <div className="d-flex align-items-center">
                <span>{name}</span>
                <LanguageIcon className="ml-1" lang={lang} />
              </div>
              <div className="d-flex justify-content-between align-items-baseline">
                <div className="d-flex align-items-baseline">
                  <img src="/assets/images/cup.svg" alt="rating" />
                  <span className="ml-1">{data?.user?.rank || userInfo.rank || '####'}</span>
                </div>
                <div className="d-flex align-items-baseline ml-2">
                  <img src="/assets/images/rating.svg" alt="rating" />
                  <span className="ml-1">{data?.user?.rating || userInfo.rating || '####'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col d-flex justify-content-between">
          <div>
            <span>Won:</span>
            <b className="text-success">{data ? data.stats.games.won : '#'}</b>
          </div>
          <div className="ml-1">
            <span>Lost:</span>
            <b className="text-danger">{data ? data.stats.games.lost : '#'}</b>
          </div>
          <div className="ml-1">
            <span>GaveUp:</span>
            <b className="text-warning">{data ? data.stats.games.gaveUp : '#'}</b>
          </div>
        </div>
      </div>
      {!data ? (
        <Loading small />
      ) : (
        <UserAchievements achievements={data.user.achievements} />
      )}
    </div>
  );
};

export default UserStats;
