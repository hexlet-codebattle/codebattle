import React from 'react';
import _ from 'lodash';

// TODO: Unify with components/LanguageIcon.js
const LangIcon = ({ size = 'md', lang }) => {
  const [width, height] = size === 'sm' ? [10, 10] : [50, 50];
  return (
    <img
      alt={lang}
      title={lang}
      width={width}
      height={height}
      src={`/assets/images/achievements/${lang}.png`}
    />
  );
};

const renderPolyglotAchievement = languages => (
  <div key="polyglot" className="cb-polyglot">
    <div className="d-flex h-75 flex-wrap align-items-center justify-content-around">
      {languages.map(lang => (
        <LangIcon key={lang} lang={lang} size="sm" />
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
            <LangIcon key={el} lang={el} size="sm" />
          );
        })}
      </div>
    );
  }
  return '';
};
export default UserAchievements;
