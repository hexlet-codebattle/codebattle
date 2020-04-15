import React from 'react';
import _ from 'lodash';

const renderPolyglotAchievement = languages => (
  <div key="polyglot" className="cb-polyglot">
    <div className="d-flex h-75 flex-wrap align-items-center justify-content-around">
      {languages.map(el => (
        <img key={el} alt={el} width="10" height="10" src={`/assets/images/achievements/${el}.png`} />
      ))}
    </div>
  </div>
);

const UserAchievements = achievements => {
  if (!_.isEmpty(achievements)) {
    return (
      <div className="d-flex justify-content-start">
        {achievements.map(el => {
          const [name, languages] = el.split('?');
          if (name === 'win_games_with') {
            return renderPolyglotAchievement(languages.split('_'));
          }
          return (
            <img
              key={el}
              src={`/assets/images/achievements/${el}.png`}
              className="mr-1"
              alt={el}
              height="50"
              width="50"
            />
          );
        })}
      </div>
    );
  }
  return '';
};
export default UserAchievements;
