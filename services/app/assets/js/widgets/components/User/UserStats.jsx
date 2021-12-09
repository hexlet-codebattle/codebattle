import React from 'react';
import Loading from '../Loading';
import UserAchievements from './UserAchievements';
import LanguageIcon from '../LanguageIcon';

const getUserAvatarUrl = ({ githubId, discordId, discordAvatar }) => {
  if (githubId) {
    return `https://avatars0.githubusercontent.com/u/${githubId}`;
  }

  if (discordId) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}`;
  }

  return 'https://avatars0.githubusercontent.com/u/35539033';
};

const UserStats = ({ data }) => {
  if (!data) {
    return <Loading small />;
  }

  const { stats, user } = data;
  return (
    <div className="container-fluid p-2">
      <div className="row">
        <div className="col d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <img
              className="img-fluid"
              style={{ maxHeight: '40px', width: '40px' }}
              src={getUserAvatarUrl(user)}
              alt="User avatar"
            />
            <div className="d-flex flex-column ml-2">
              <div className="d-flex align-items-center">
                <span>{user.name}</span>
                <div className="ml-1">
                  <LanguageIcon lang={user.lang} />
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-baseline">
                <div className="d-flex align-items-baseline">
                  <img src="/assets/images/cup.svg" alt="rating" />
                  <span className="ml-1">{user.rank}</span>
                </div>
                <div className="d-flex align-items-baseline ml-2">
                  <img src="/assets/images/rating.svg" alt="rating" />
                  <span className="ml-1">{user.rating}</span>
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
            <b className="text-success">{stats.won}</b>
          </div>
          <div className="ml-1">
            <span>Lost:</span>
            <b className="text-danger">{stats.lost}</b>
          </div>
          <div className="ml-1">
            <span>GaveUp:</span>
            <b className="text-warning">{stats.gaveUp}</b>
          </div>
        </div>
      </div>
      {UserAchievements(user.achievements)}
    </div>
  );
};

export default UserStats;
