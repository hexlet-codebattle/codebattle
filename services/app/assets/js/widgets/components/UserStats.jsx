import React from 'react';
import _ from 'lodash';
import Loading from './Loading';
import UserAchievements from './UserAchievements';

const UserStats = ({ data, isAnonymous }) => {
  if (data) {
    const { stats, achievements } = data;
    const achivementsTitle = _.isEmpty(achievements) || isAnonymous ? 'No achievements' : 'Achievements:';
    const userAchivements = isAnonymous ? '' : UserAchievements(achievements);

    return (
      <div>
        <ul className="list-inline">
          <li className="list-inline-item">
            Won:&nbsp;
            <b className="text-success">{isAnonymous ? '%$#@' : stats.won}</b>
          </li>
          <li className="list-inline-item">
            Lost:&nbsp;
            <b className="text-danger">{isAnonymous ? '%$#@' : stats.lost}</b>
          </li>
          <li className="list-inline-item">
            Gave up:&nbsp;
            <b className="text-warning">{isAnonymous ? '%$#@' : stats.gaveUp}</b>
          </li>
        </ul>
        {achivementsTitle}
        {userAchivements}
      </div>
    );
  }

  return <Loading small />;
};

export default UserStats;
