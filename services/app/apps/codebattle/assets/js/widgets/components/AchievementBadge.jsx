import React from 'react';

import langIconNames from '../config/langIconNames';

const gradeLabels = {
  rookie: 'Rookie',
  challenger: 'Challenger',
  pro: 'Pro',
  elite: 'Elite',
  masters: 'Masters',
  grand_slam: 'Grand Slam',
};

const gradeTone = {
  rookie: 'grade-rookie',
  challenger: 'grade-challenger',
  pro: 'grade-pro',
  elite: 'grade-elite',
  masters: 'grade-masters',
  grand_slam: 'grade-grand-slam',
};

const gradeIcon = {
  rookie: '/assets/images/seasons/rookie.svg',
  challenger: '/assets/images/seasons/challenger.svg',
  pro: '/assets/images/seasons/pro.svg',
  elite: '/assets/images/seasons/elite.svg',
  masters: '/assets/images/seasons/masters.svg',
  grand_slam: '/assets/images/seasons/grand_slam.svg',
};

function mapAchievement(achievement) {
  const { type, meta = {} } = achievement;

  switch (type) {
    case 'games_played_milestone':
      return {
        title: 'Games played milestone',
        label: 'Games',
        value: meta.label || meta.count || '-',
        tone: 'steel',
      };
    case 'graded_tournaments_played_milestone':
      return {
        title: 'Graded tournaments played milestone',
        label: 'Tournaments',
        value: meta.label || meta.count || '-',
        tone: 'iron',
      };
    case 'highest_tournament_win_grade': {
      const grade = meta.grade;
      return {
        title: 'Highest tournament win grade',
        label: 'Highest Win',
        value: '',
        tone: gradeTone[grade] || 'iron',
      };
    }
    case 'polyglot':
      return {
        title: `Polyglot: ${(meta.languages || []).join(', ')}`,
        label: 'Polyglot',
        value: '',
        tone: 'grade-pro',
      };
    case 'season_champion_wins':
      return {
        title: 'Season champion wins',
        label: 'Season Wins',
        value: meta.count || 0,
        tone: 'silver',
      };
    case 'grand_slam_champion_wins':
      return {
        title: 'Grand Slam champion wins',
        label: 'Grand Slam',
        value: meta.count || 0,
        tone: 'gold',
      };
    case 'best_win_streak':
      return {
        title: 'Best win streak',
        label: 'Best Streak',
        value: meta.count || 0,
        tone: 'bronze',
      };
    default:
      return {
        title: type,
        label: type,
        value: meta.count || '-',
        tone: 'iron',
      };
  }
}

function AchievementBadge({ achievement }) {
  const badge = mapAchievement(achievement);
  const isPolyglot = achievement.type === 'polyglot';
  const isHighestGrade = achievement.type === 'highest_tournament_win_grade';
  const languages = achievement?.meta?.languages || [];
  const grade = achievement?.meta?.grade;

  return (
    <div className={`cb-achievement-badge cb-achievement-badge--${badge.tone}`} title={badge.title}>
      <div className="cb-achievement-badge__label">{badge.label}</div>
      {isHighestGrade && gradeIcon[grade] && (
        <div className="cb-achievement-badge__grade-icon">
          <img
            src={gradeIcon[grade]}
            alt={grade}
            title={gradeLabels[grade] || grade}
            width="20"
            height="20"
          />
        </div>
      )}
      {isPolyglot && (
        <div className="cb-achievement-badge__icons">
          {languages.map((lang) => {
            const iconName = langIconNames[lang] || lang;

            return (
              <img
                key={lang}
                src={`/assets/images/achievements/${iconName}.png`}
                alt={lang}
                title={lang}
                width="11"
                height="11"
              />
            );
          })}
        </div>
      )}
      {badge.value && <div className="cb-achievement-badge__value">{badge.value}</div>}
    </div>
  );
}

export default AchievementBadge;
