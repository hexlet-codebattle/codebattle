import { Group, Stack, Text, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import type { TournamentGrade } from '@/features/lobby/types';
import { LangIcon, langName } from '@/shared/LangIcon';

import type { Achievement, UserCardData } from './api';
import classes from './UserCard.module.css';

// Shared by the hover card and the profile page.

export const GRADE_WINS: { grade: TournamentGrade; key: keyof UserCardData['metrics']['tournaments_stats'] }[] = [
  { grade: 'grand_slam', key: 'grand_slam_wins' },
  { grade: 'masters', key: 'masters_wins' },
  { grade: 'elite', key: 'elite_wins' },
  { grade: 'pro', key: 'pro_wins' },
  { grade: 'challenger', key: 'challenger_wins' },
  { grade: 'rookie', key: 'rookie_wins' },
];

export const PRESENCE_LABELS: Record<string, string> = {
  playing: 'In a game',
  watching: 'Watching',
  tournament: 'In tournament',
  lobby: 'Lobby',
  task: 'Editing a task',
  online: 'Online',
};

// Achievement type → title (i18n key) and tile tone (a --cb-grade-* metal).
const ACHIEVEMENTS: Record<string, { title: string; tone: string }> = {
  games_played_milestone: { title: 'Games', tone: 'challenger' },
  graded_tournaments_played_milestone: { title: 'Tournaments', tone: 'rookie' },
  highest_tournament_win_grade: { title: 'Highest Win', tone: 'grand_slam' },
  polyglot: { title: 'Polyglot', tone: 'pro' },
  season_champion_wins: { title: 'Season Wins', tone: 'masters' },
  grand_slam_champion_wins: { title: 'Grand Slam', tone: 'grand_slam' },
  best_win_streak: { title: 'Best Streak', tone: 'elite' },
};

export function AchievementTile({ achievement }: { achievement: Achievement }) {
  const { t } = useTranslation();
  const config = ACHIEVEMENTS[achievement.type] ?? { title: achievement.type, tone: 'rookie' };
  const { meta } = achievement;

  let value: ReactNode = meta.label ?? meta.count ?? '—';
  let tone = config.tone;
  let label = t(config.title);

  if (achievement.type === 'highest_tournament_win_grade' && meta.grade) {
    tone = meta.grade;
    value = <GradeIcon grade={meta.grade as TournamentGrade} size={24} />;
  } else if (achievement.type === 'polyglot') {
    const languages = meta.languages ?? [];
    label = `${label}: ${languages.map(langName).join(', ')}`;
    value = (
      <Group gap={4} justify="center">
        {languages.map((lang) => (
          <LangIcon key={lang} lang={lang} size={16} withTooltip={false} />
        ))}
      </Group>
    );
  }

  return (
    <Tooltip label={label} openDelay={300} multiline maw={240}>
      <Stack gap={2} align="center" justify="center" className={classes.tile} style={{ '--tone': `var(--cb-grade-${tone})` }}>
        <Text fz={10} fw={700} tt="uppercase" lts="0.04em" className={classes.tileTitle} ta="center" lh={1.1}>
          {t(config.title)}
        </Text>
        <div className={classes.tileValue}>{value}</div>
      </Stack>
    </Tooltip>
  );
}

/** Achievements worth a tile: `game_stats` / `tournaments_stats` are raw metrics, not badges. */
export const visibleAchievements = (achievements: Achievement[] | undefined) =>
  (achievements ?? []).filter(({ type }) => type in ACHIEVEMENTS || !type.endsWith('_stats'));
