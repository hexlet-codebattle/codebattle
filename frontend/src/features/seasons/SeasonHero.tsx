import { Badge, Card, Group, Progress, Stack, Text, Title } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { type Season, seasonDates, seasonProgress, seasonStatus, seasonTitle } from './types';

export function StatusBadge({ season }: { season: Season }) {
  const { t } = useTranslation();
  const status = seasonStatus(season);

  return (
    <Badge size="sm" variant="light" color={status === 'active' ? 'green' : status === 'upcoming' ? 'blue' : 'gray'}>
      {status === 'active' ? t('Live') : status === 'upcoming' ? t('Upcoming') : t('Finished')}
    </Badge>
  );
}

/** Season name, dates, status and (while it runs) how much of it is left. */
export function SeasonHero({ season, actions }: { season: Season; actions?: ReactNode }) {
  const { t } = useTranslation();
  const status = seasonStatus(season);
  const { share, daysLeft } = seasonProgress(season);

  return (
    <Card padding="lg">
      <Group justify="space-between" align="center" gap="md">
        <Stack gap={4} miw={0}>
          <Group gap="sm">
            <Title order={3}>{seasonTitle(season)}</Title>
            <StatusBadge season={season} />
          </Group>
          <Group gap={6} c="dimmed">
            <IconCalendar size={14} />
            <Text size="sm">{seasonDates(season)}</Text>
          </Group>
        </Stack>
        {actions && <Group gap="xs">{actions}</Group>}
      </Group>
      {status === 'active' && (
        <Stack gap={4} mt="md">
          <Progress value={share * 100} size="sm" color="green" aria-label={t('Season progress')} />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {t('%{percent}% played', { percent: Math.round(share * 100) })}
            </Text>
            <Text size="xs" c="dimmed">
              {t('%{count} days left', { count: daysLeft })}
            </Text>
          </Group>
        </Stack>
      )}
    </Card>
  );
}
