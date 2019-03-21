import React from 'react';
import _ from 'lodash';
import Loading from './Loading';

const UserStats = ({ data }) => {
  if (data) {
    const { stats, achievements } = data;
    const achivementsTitle = _.isEmpty(achievements) ? 'No achievements' : 'Achievements:';
    return (
      <div>
        <ul className="list-inline">
          <li className="list-inline-item">
            Won:&nbsp;
            <b className="text-success">{stats.won}</b>
          </li>
          <li className="list-inline-item">
            Lost:&nbsp;
            <b className="text-danger">{stats.lost}</b>
          </li>
          <li className="list-inline-item">
            Gave up:&nbsp;
            <b className="text-warning">{stats.gave_up}</b>
          </li>
        </ul>
        {achivementsTitle}
        {!_.isEmpty(achievements) && (
          <ul className="list-inline">
            {achievements.map(el => (
              <li key={el} className="list-inline-item">
                <img src={`/assets/images/achievements/${el}.png`} alt={el} height="50" width="50" />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return <Loading small />;
};

export default UserStats;
