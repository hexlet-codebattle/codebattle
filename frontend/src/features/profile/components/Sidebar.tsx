import { Anchor, Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { AchievementTile, visibleAchievements } from '@/features/users/achievements';

import type { ProfileStats } from '../api';

import classes from './Profile.module.css';

export function AchievementsCard({ profile }: { profile: ProfileStats }) {
  const { t } = useTranslation();
  const achievements = visibleAchievements(profile.achievements);

  if (achievements.length === 0) return null;

  return (
    <Card>
      <Title order={5} mb="sm">
        {t('Achievements')}
      </Title>
      <SimpleGrid cols={3} spacing={6}>
        {achievements.map((achievement) => (
          <AchievementTile key={achievement.type} achievement={achievement} />
        ))}
      </SimpleGrid>
    </Card>
  );
}

/** Past seasons, newest first; the top three wear the medal colours. */
export function SeasonsCard({ profile }: { profile: ProfileStats }) {
  const { t } = useTranslation();

  if (profile.season_results.length === 0) return null;

  return (
    <Card>
      <Title order={5} mb="sm">
        {t('Seasons')}
      </Title>
      <Stack gap={6}>
        {profile.season_results.map((result) => (
          <Anchor key={result.season_id} href={`/seasons/${result.season_id}`} className={classes.season} underline="never">
            <span className={classes.seasonPlace} data-place={result.place <= 3 ? result.place : undefined}>
              #{result.place}
            </span>
            <Stack gap={0} miw={0} flex={1}>
              <Text size="sm" fw={600} c="bright" truncate>
                {t('Season %{name}, %{year}', { name: result.season_name, year: result.season_year })}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {t('Tournaments: %{count}', { count: result.tournaments_count })} ·{' '}
                {t('Wins: %{wins} / %{games}', { wins: result.total_wins_count, games: result.total_games_count })}
              </Text>
            </Stack>
            <Text size="sm" ff="monospace" fw={700} c="bright">
              {result.total_points}
            </Text>
          </Anchor>
        ))}
      </Stack>
    </Card>
  );
}
