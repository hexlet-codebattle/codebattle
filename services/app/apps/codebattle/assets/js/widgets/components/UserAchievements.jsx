import React from 'react';
import isEmpty from 'lodash/isEmpty';

const LangIcon = ({ size = 'md', lang }) => {
  const [width, height] = size === 'sm' ? [14, 14] : [65, 65];
  const margin = size === 'sm' ? 'm-0' : 'mr-1 mb-1';
  return (
    <img
      alt={lang}
      title={lang}
      width={width}
      height={height}
      className={margin}
      src={`/assets/images/achievements/${lang}.png`}
    />
  );
};

const renderPolyglotAchievement = languages => (
  <div key="polyglot" className="cb-polyglot">
    <div className="d-flex h-75 flex-wrap align-items-center justify-content-around cb-polyglot-icons">
      {languages.map(lang => (
        <LangIcon key={lang} lang={lang} size="sm" />
      ))}
    </div>
  </div>
);

const UserAchievements = ({ achievements }) => {
  if (!isEmpty(achievements)) {
    return (
      <div className="d-flex justify-content-start flex-wrap mt-2">
        {achievements.map(el => {
          const [name, languages] = el.split('?');
          if (name === 'win_games_with') {
            return renderPolyglotAchievement(languages.split('_'));
          }
          return (
            <LangIcon key={el} lang={el} />
          );
        })}
      </div>
    );
  }
  return '';
};

export default UserAchievements;
