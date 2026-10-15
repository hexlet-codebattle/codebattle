import { Anchor, Card, Group, Stack, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import { PlaceChip } from './LeaderboardTable';
import { StatusBadge } from './SeasonHero';
import classes from './Seasons.module.css';
import { type Season, type SeasonResult, seasonDates, seasonStatus, seasonTitle } from './types';

type Champion = Pick<SeasonResult, 'place' | 'user_id' | 'user_name' | 'total_points'> &
  Partial<Pick<SeasonResult, 'user_lang' | 'avatar_url' | 'clan_name'>>;

/** A season with its top three, linking to the full results. */
export function SeasonCard({ season, top3 }: { season: Season; top3: Champion[] }) {
  const { t } = useTranslation();
  const status = seasonStatus(season);

  return (
    <Card className={classes.seasonCard} data-status={status}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={0} miw={0}>
          <Anchor href={`/seasons/${season.id}`} fw={700} fz="md" c="bright" truncate>
            {seasonTitle(season)}
          </Anchor>
          <Text size="xs" c="dimmed">
            {seasonDates(season)}
          </Text>
        </Stack>
        <StatusBadge season={season} />
      </Group>

      <Stack gap={2} style={{ flex: 1 }}>
        {top3.length === 0 ? (
          <Text size="sm" c="dimmed" py="sm" ta="center">
            {status === 'upcoming' ? t('Starts soon') : t('No results yet')}
          </Text>
        ) : (
          top3.map((row) => {
            const user = { id: row.user_id, name: row.user_name, avatar_url: row.avatar_url ?? null };
            return (
              <div key={row.user_id} className={classes.championRow}>
                <PlaceChip place={row.place} />
                <UserAvatar user={user} size={24} />
                <Stack gap={0} miw={0} style={{ flex: 1 }}>
                  <Group gap={6} wrap="nowrap" miw={0}>
                    {row.user_lang !== undefined && <LangIcon lang={row.user_lang} />}
                    <UserCard user={user}>
                      <Text span size="sm" fw={600} c="bright" truncate>
                        {row.user_name}
                      </Text>
                    </UserCard>
                  </Group>
                  {row.clan_name && (
                    <Text size="xs" c="dimmed" truncate>
                      {row.clan_name}
                    </Text>
                  )}
                </Stack>
                <Text size="sm" ff="monospace" fw={700} c="bright">
                  {row.total_points}
                </Text>
              </div>
            );
          })
        )}
      </Stack>

      <Anchor href={`/seasons/${season.id}`} size="sm" c="dimmed">
        <Group gap={2} justify="flex-end">
          {t('Full Results')}
          <IconChevronRight size={14} />
        </Group>
      </Anchor>
    </Card>
  );
}
