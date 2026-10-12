import {
  Alert,
  Anchor,
  Badge,
  Center,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getLocale } from '@/i18n';
import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { gradeLabel, tournamentTitle } from '@/features/lobby/format';
import { formatSeconds } from '@/features/tasks/shared';
import { LangIcon } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import { PlaceChip } from './LeaderboardTable';
import classes from './Seasons.module.css';
import { avgPlace, betterThan, formatPlayTime, type PlayerStats, type Season, type SeasonResult } from './types';

async function fetchStats(seasonId: number, userId: number): Promise<PlayerStats> {
  const response = await fetch(`/api/v1/seasons/${seasonId}/players/${userId}/stats`);
  if (!response.ok) throw new Error(`season stats: ${response.status}`);
  return response.json();
}

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const winRate = (row: SeasonResult) => (row.total_games_count ? (row.total_wins_count / row.total_games_count) * 100 : 0);

const round = (value: number) => (Number.isInteger(value) ? value : Number(value.toFixed(1)));

function Figure({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={classes.stat}>
      <Text ff="monospace" fw={800} fz="lg" c="bright" truncate>
        {value}
      </Text>
      <Text size="xs" c="dimmed" truncate>
        {label}
        {sub && ` · ${sub}`}
      </Text>
    </div>
  );
}

/** Player vs the median player of the table, on one scale per metric. */
function VersusMedian({ player, results }: { player: SeasonResult; results: SeasonResult[] }) {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    const metric = (label: string, get: (row: SeasonResult) => number, suffix = '') => {
      const mine = get(player);
      const typical = median(results.map(get));
      return { label, mine, typical, suffix };
    };
    return [
      metric(t('Points'), (row) => row.total_points),
      metric(t('Wins'), (row) => row.total_wins_count),
      metric(t('Win Rate'), winRate, '%'),
      metric(t('Score'), (row) => row.total_score),
      metric(t('Tournaments'), (row) => row.tournaments_count),
    ];
  }, [player, results, t]);

  return (
    <Stack gap="sm">
      <Group gap="md">
        <Group gap={6}>
          <span className={classes.barFill} data-tone="success" style={{ width: 12, height: 6, display: 'inline-block' }} />
          <Text size="xs" c="dimmed">
            {player.user_name}
          </Text>
        </Group>
        <Group gap={6}>
          <span className={classes.barFill} data-tone="muted" style={{ width: 12, height: 6, display: 'inline-block' }} />
          <Text size="xs" c="dimmed">
            {t('Median player')}
          </Text>
        </Group>
      </Group>
      {rows.map(({ label, mine, typical, suffix }) => {
        const scale = Math.max(mine, typical) || 1;
        const delta = typical ? Math.round(((mine - typical) / typical) * 100) : null;
        return (
          <Stack key={label} gap={4}>
            <Group justify="space-between" gap="xs">
              <Text size="sm" fw={600}>
                {label}
              </Text>
              <Group gap={8}>
                <Text size="sm" ff="monospace" fw={700} c="bright">
                  {round(mine)}
                  {suffix}
                </Text>
                <Text size="xs" ff="monospace" c="dimmed">
                  {t('vs %{value}', { value: `${round(typical)}${suffix}` })}
                </Text>
                {delta != null && delta !== 0 && (
                  <Badge size="xs" variant="light" color={delta > 0 ? 'green' : 'red'}>
                    {delta > 0 ? `+${delta}%` : `${delta}%`}
                  </Badge>
                )}
              </Group>
            </Group>
            <div className={classes.bar}>
              <div className={classes.barFill} data-tone="success" style={{ width: `${(mine / scale) * 100}%` }} />
            </div>
            <div className={classes.bar}>
              <div className={classes.barFill} data-tone="muted" style={{ width: `${(typical / scale) * 100}%` }} />
            </div>
          </Stack>
        );
      })}
    </Stack>
  );
}

function GradeTable({ stats }: { stats: PlayerStats['grade_stats'] }) {
  const { t } = useTranslation();
  const maxPoints = Math.max(1, ...stats.map((row) => row.total_points));

  if (stats.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        {t('No grade stats available')}
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={560}>
      <Table verticalSpacing={6} fz="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('Grade')}</Table.Th>
            <Table.Th ta="right">{t('Tournaments')}</Table.Th>
            <Table.Th w="30%">{t('Points')}</Table.Th>
            <Table.Th ta="right">{t('W/G')}</Table.Th>
            <Table.Th ta="right">{t('Best')}</Table.Th>
            <Table.Th ta="right">{t('Avg')}</Table.Th>
            <Table.Th ta="right">{t('Podiums')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {stats.map((row) => (
            <Table.Tr key={row.grade}>
              <Table.Td>
                <Group gap={8} wrap="nowrap">
                  <GradeIcon grade={row.grade} size={20} />
                  <Text size="sm" fw={600} c="bright">
                    {gradeLabel(row.grade)}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td ta="right" ff="monospace">
                {row.tournaments_count}
              </Table.Td>
              <Table.Td>
                <Group gap={8} wrap="nowrap">
                  <div className={classes.bar} style={{ flex: 1 }}>
                    <div
                      className={classes.barFill}
                      style={{ width: `${(row.total_points / maxPoints) * 100}%`, background: `var(--cb-grade-${row.grade})` }}
                    />
                  </div>
                  <Text size="sm" ff="monospace" fw={700} c="bright" w={52} ta="right">
                    {row.total_points}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td ta="right" ff="monospace">
                {row.total_wins}/{row.total_games}
              </Table.Td>
              <Table.Td ta="right">{row.best_place != null ? <PlaceChip place={row.best_place} /> : '—'}</Table.Td>
              <Table.Td ta="right" ff="monospace" c="dimmed">
                {row.avg_place != null ? Number(row.avg_place).toFixed(1) : '—'}
              </Table.Td>
              <Table.Td ta="right">
                <Group gap={3} justify="flex-end" wrap="nowrap">
                  {row.podium_finishes.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  ) : (
                    row.podium_finishes.map((place) => <PlaceChip key={place} place={place} />)
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

const shortDate = (value: string) =>
  new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });

function TournamentsTable({ tournaments }: { tournaments: PlayerStats['recent_tournaments'] }) {
  const { t } = useTranslation();

  if (tournaments.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        {t('No tournament data available')}
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={560}>
      <Table verticalSpacing={6} fz="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('Date')}</Table.Th>
            <Table.Th>{t('Tournament')}</Table.Th>
            <Table.Th ta="right">{t('Place')}</Table.Th>
            <Table.Th ta="right">{t('Points')}</Table.Th>
            <Table.Th ta="right">{t('W/G')}</Table.Th>
            <Table.Th ta="right">{t('Time')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tournaments.map((row) => (
            <Table.Tr key={row.tournament_id}>
              <Table.Td c="dimmed" ff="monospace" fz="xs">
                {shortDate(row.started_at)}
              </Table.Td>
              <Table.Td maw={260}>
                <Group gap={8} wrap="nowrap">
                  <GradeIcon grade={row.grade} size={18} />
                  <Anchor href={`/tournaments/${row.tournament_id}`} size="sm" c="bright" fw={600} truncate>
                    {row.tournament_name
                      ? tournamentTitle(row.tournament_name, row.grade)
                      : t('Tournament #%{id}', { id: row.tournament_id })}
                  </Anchor>
                </Group>
              </Table.Td>
              <Table.Td ta="right">
                <Group gap={4} justify="flex-end" wrap="nowrap">
                  <PlaceChip place={row.place} />
                  <Text size="xs" c="dimmed" ff="monospace">
                    /{row.total_participants}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td ta="right" ff="monospace" fw={700} c="bright">
                {row.points}
              </Table.Td>
              <Table.Td ta="right" ff="monospace">
                {row.wins_count}/{row.games_count}
              </Table.Td>
              <Table.Td ta="right" ff="monospace" c="dimmed">
                {formatSeconds(row.total_time)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function Trend({ trend }: { trend: PlayerStats['performance_trend'] }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...trend.map((week) => week.total_points));

  if (trend.length < 2) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        {t('Not enough data for trend analysis')}
      </Text>
    );
  }

  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed">
        {t('Points per week')}
      </Text>
      <div className={classes.trend}>
        {trend.map((week) => (
          <Tooltip
            key={week.week}
            withArrow
            label={
              <Stack gap={0}>
                <Text size="xs" fw={700}>
                  {t('Week of %{date}', { date: shortDate(week.week) })}
                </Text>
                <Text size="xs">{t('Points: %{count}', { count: week.total_points })}</Text>
                <Text size="xs">{t('Tournaments: %{count}', { count: week.tournaments_count })}</Text>
                <Text size="xs">{t('Wins: %{wins} / %{games}', { wins: week.total_wins, games: week.total_games })}</Text>
              </Stack>
            }
          >
            <div className={classes.trendCol}>
              <div className={classes.trendBar} style={{ height: `${(week.total_points / max) * 100}%` }} />
            </div>
          </Tooltip>
        ))}
      </div>
      <Group justify="space-between">
        <Text size="xs" c="dimmed" ff="monospace">
          {shortDate(trend[0].week)}
        </Text>
        <Text size="xs" c="dimmed" ff="monospace">
          {shortDate(trend[trend.length - 1].week)}
        </Text>
      </Group>
    </Stack>
  );
}

interface PlayerInsightsProps {
  season: Season;
  player: SeasonResult | null;
  /** Rows to compare against (median player, percentile). */
  results: SeasonResult[];
  /** Total players in the season; defaults to `results.length`. */
  totalPlayers?: number;
  onClose: () => void;
}

/** A player's season: headline numbers, comparison with the median player, grades, tournaments and weekly trend. */
export function PlayerInsights({ season, player, results, totalPlayers, onClose }: PlayerInsightsProps) {
  const { t } = useTranslation();
  const { data, isPending, isError } = useQuery({
    queryKey: ['season-player-stats', season.id, player?.user_id],
    queryFn: () => fetchStats(season.id, player!.user_id),
    enabled: player != null,
    staleTime: 60_000,
  });

  if (!player) return <Modal opened={false} onClose={onClose} />;

  const total = totalPlayers ?? results.length;
  const user = { id: player.user_id, name: player.user_name, avatar_url: player.avatar_url };
  const average = avgPlace(player.avg_place);

  return (
    <Modal
      opened
      onClose={onClose}
      size="xl"
      title={
        <Group gap="sm" wrap="nowrap">
          <UserAvatar user={user} size={44} radius="md" />
          <Stack gap={0}>
            <Group gap={6} wrap="nowrap">
              <LangIcon lang={player.user_lang} />
              <Text fw={700} fz="lg" c="bright">
                {player.user_name}
              </Text>
              <PlaceChip place={player.place} />
            </Group>
            <Text size="xs" c="dimmed">
              {[player.clan_name, t('Better than %{percent}% of players', { percent: betterThan(player.place, total) })]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Stack>
        </Group>
      }
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <Figure label={t('Points')} value={player.total_points} sub={t('#%{place} of %{count}', { place: player.place, count: total })} />
          <Figure
            label={t('Wins')}
            value={`${player.total_wins_count}/${player.total_games_count}`}
            sub={`${Math.round(winRate(player))}%`}
          />
          <Figure label={t('Tournaments')} value={player.tournaments_count} />
          <Figure
            label={t('Best / avg place')}
            value={`${player.best_place ?? '—'} / ${average == null ? '—' : average.toFixed(1)}`}
          />
          <Figure label={t('Score')} value={player.total_score} />
          <Figure label={t('Time Played')} value={formatPlayTime(player.total_time)} />
          <Figure label={t('Games')} value={player.total_games_count} />
          <Figure
            label={t('Points per tournament')}
            value={player.tournaments_count ? round(player.total_points / player.tournaments_count) : '—'}
          />
        </SimpleGrid>

        {isError && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {t('Failed to load detailed stats')}. {t('Showing basic stats only.')}
          </Alert>
        )}

        <Tabs defaultValue="overview" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="overview">{t('Overview')}</Tabs.Tab>
            <Tabs.Tab value="grades">{t('By Grade')}</Tabs.Tab>
            <Tabs.Tab value="tournaments">{t('Tournaments')}</Tabs.Tab>
            <Tabs.Tab value="trend">{t('Trends')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <VersusMedian player={player} results={results} />
          </Tabs.Panel>
          {(['grades', 'tournaments', 'trend'] as const).map((tab) => (
            <Tabs.Panel key={tab} value={tab} pt="md">
              {isPending ? (
                <Center py="xl">
                  <Loader size="sm" />
                </Center>
              ) : isError ? null : tab === 'grades' ? (
                <GradeTable stats={data.grade_stats} />
              ) : tab === 'tournaments' ? (
                <TournamentsTable tournaments={data.recent_tournaments} />
              ) : (
                <Trend trend={data.performance_trend} />
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      </Stack>
    </Modal>
  );
}
