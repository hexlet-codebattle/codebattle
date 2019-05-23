import React from 'react';
import _ from 'lodash';

const renderPolyglotAchievement = (languages) => {
  const backgroundStyle = languages.map((el, i) => `url(/assets/images/achievements/${el}.png) no-repeate ${25 + i * 25}% 75%`);
  const divStyle = {
    width: '50px',
    height: '50px',
    background: `url(/assets/images/achievements/polyglot.png), ${backgroundStyle.join(',')}`,
  };
  console.log(divStyle);
  return (
    <li key="polyglot" className="list-inline-item">
      <div style={divStyle}>test</div>
    </li>
  );
};

const UserAchievements = (achievements) => {
  if (!_.isEmpty(achievements)) {
    return (
      <ul className="list-inline">
        {achievements.map((el) => {
          const [name, languages] = el.split('?');
          if (name === 'win_games_with') {
            return renderPolyglotAchievement(languages.split('_'));
          }
          return (
            <li key={el} className="list-inline-item">
              <img src={`/assets/images/achievements/${el}.png`} alt={el} height="50" width="50" />
            </li>
          );
        })}
      </ul>
    );
  }
  return '';
};
export default UserAchievements;
