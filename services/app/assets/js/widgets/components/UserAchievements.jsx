import React from 'react';
import _ from 'lodash';

const UserAchievements = ({ achievements }) => {
  if (!_.isEmpty(achievements)) {
    return (
      <ul className="list-inline">
        {achievements.map(el => (
          <li key={el} className="list-inline-item">
            <img src={`/assets/images/achievements/${el}.png`} alt={el} height="50" width="50" />
          </li>
        ))}
      </ul>
    );
  }
};
export default UserAchievements;
