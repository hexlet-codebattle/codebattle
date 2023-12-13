import React from 'react';

function Achievement({ achievement }) {
  if (!achievement.includes('win_games_with')) {
    return (
      <img
        className="mr-1 mb-1"
        src={`/assets/images/achievements/${achievement}.png`}
        alt={achievement}
        title={achievement}
        width="65"
        height="65"
      />
    );
  }

  const langs = achievement.split('?').pop().split('_');

  return (
    <div className="cb-polyglot mr-1 mb-1" title={achievement}>
      <div className="cb-polyglot-icons d-flex flex-wrap align-items-center justify-content-around h-75">
        {langs.map(lang => (
          <img
            src={`/assets/images/achievements/${lang}.png`}
            alt={lang}
            title={lang}
            width="14"
            height="14"
            key={lang}
          />
        ))}
      </div>
    </div>
  );
}

export default Achievement;
