import { Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { LangIcon, langName } from '@/shared/LangIcon';

import classes from './Seasons.module.css';
import { formatPlayTime, type SeasonResult } from './types';

const TOP = 5;

function ShareRow({ label, value, max, icon, hint }: { label: string; value: number; max: number; icon?: ReactNode; hint: string }) {
  return (
    <Stack gap={3}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap" miw={0}>
          {icon}
          <Text size="sm" fw={600} c="bright" truncate>
            {label}
          </Text>
        </Group>
        <Text size="xs" c="dimmed" ff="monospace" style={{ whiteSpace: 'nowrap' }}>
          {hint}
        </Text>
      </Group>
      <div className={classes.bar}>
        <div className={classes.barFill} style={{ width: `${(value / (max || 1)) * 100}%` }} />
      </div>
    </Stack>
  );
}

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={classes.stat}>
      <Text ff="monospace" fw={800} fz="xl" c="bright" truncate>
        {value}
      </Text>
      <Text size="xs" c="dimmed" truncate>
        {label}
      </Text>
    </div>
  );
}

interface SeasonStatsProps {
  results: SeasonResult[];
  /** True when `results` is only the top of the table (Hall of Fame's top 100). */
  partial?: boolean;
}

/** Season at a glance: totals, the strongest clans by points and the most played languages. */
export function SeasonStats({ results, partial }: SeasonStatsProps) {
  const { t } = useTranslation();

  const { totals, clans, langs } = useMemo(() => {
    const clanMap = new Map<string, { points: number; players: number }>();
    const langMap = new Map<string, number>();
    const sums = { points: 0, games: 0, time: 0 };

    for (const row of results) {
      sums.points += row.total_points;
      sums.games += row.total_games_count;
      sums.time += row.total_time;
      if (row.clan_name) {
        const clan = clanMap.get(row.clan_name) ?? { points: 0, players: 0 };
        clan.points += row.total_points;
        clan.players += 1;
        clanMap.set(row.clan_name, clan);
      }
      if (row.user_lang) langMap.set(row.user_lang, (langMap.get(row.user_lang) ?? 0) + 1);
    }

    return {
      totals: sums,
      clans: [...clanMap.entries()].sort((a, b) => b[1].points - a[1].points).slice(0, TOP),
      langs: [...langMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP),
    };
  }, [results]);

  if (results.length === 0) return null;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      <Card>
        <Title order={5} mb="sm">
          {partial ? t('Top %{count} at a glance', { count: results.length }) : t('Season at a glance')}
        </Title>
        <SimpleGrid cols={2} spacing="xs">
          <Figure label={t('Players')} value={results.length} />
          <Figure label={t('Points awarded')} value={totals.points.toLocaleString()} />
          <Figure label={t('Games played')} value={totals.games.toLocaleString()} />
          <Figure label={t('Time in battles')} value={formatPlayTime(totals.time)} />
        </SimpleGrid>
      </Card>

      <Card>
        <Title order={5} mb="sm">
          {t('Top clans')}
        </Title>
        {clans.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('No clans yet')}
          </Text>
        ) : (
          <Stack gap="xs">
            {clans.map(([name, clan]) => (
              <ShareRow
                key={name}
                label={name}
                value={clan.points}
                max={clans[0][1].points}
                hint={t('%{points} pts · %{players} players', { points: clan.points, players: clan.players })}
              />
            ))}
          </Stack>
        )}
      </Card>

      <Card>
        <Title order={5} mb="sm">
          {t('Weapons of choice')}
        </Title>
        <Stack gap="xs">
          {langs.map(([lang, players]) => (
            <ShareRow
              key={lang}
              label={langName(lang)}
              icon={<LangIcon lang={lang} withTooltip={false} />}
              value={players}
              max={langs[0][1]}
              hint={t('%{count} players', { count: players })}
            />
          ))}
        </Stack>
      </Card>
    </SimpleGrid>
  );
}
