import { Button, Card, Center, Group, Loader, Pagination, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconChevronRight, IconCrown } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { t as translate } from '@/i18n';

import { useSharedProps } from '@/shared/useSharedProps';
import { UserCard } from '@/features/users/UserCard';
import { UserAvatar } from '@/shared/UserAvatar';
import { LangIcon } from '@/shared/LangIcon';

import { formatDate } from '../format';

import classes from './Leaderboard.module.css';

type Period = 'week' | 'month' | 'year' | 'all';

/** One tab is active across both rows: a season (null = current) or an Elo period. */
type Selection = { kind: 'season'; seasonId: number | null } | { kind: 'elo'; period: Period };

interface SeasonInfo {
  id: number;
  name: string;
  year: number;
  starts_at: string;
  ends_at: string;
}

interface Entry {
  id: number;
  name: string;
  avatar_url: string | null;
  lang?: string | null;
  position: number;
  rating?: number;
  // week / month / year
  gain?: number;
  games?: number;
  wins?: number;
  // season
  points?: number;
  tournaments?: number;
  clan?: string | null;
}

interface LeaderboardPage {
  entries: Entry[];
  me: Entry | null;
  page_info: { page_number: number; total_pages: number; total_entries: number };
  season?: SeasonInfo | null;
  seasons?: SeasonInfo[];
}

const PAGE_SIZE = 10;

// Labels are i18n keys.
const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All-time' },
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);

  return response.json();
}

function fetchLeaderboard(selection: Selection, page: number) {
  const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });

  if (selection.kind === 'elo') {
    query.set('period', selection.period);
    return fetchJson<LeaderboardPage>(`/api/v1/leaderboard/elo?${query}`);
  }

  if (selection.seasonId != null) query.set('season_id', String(selection.seasonId));
  return fetchJson<LeaderboardPage>(`/api/v1/leaderboard/season?${query}`);
}

/** "S4 ’26" / "С4 ’26" for numbered seasons, the name otherwise. */
const seasonTabLabel = (season: SeasonInfo) =>
  /^\d+$/.test(season.name)
    ? translate('S%{name} ’%{year}', { name: season.name, year: String(season.year).slice(-2) })
    : season.name;

function Metric({ selection, entry }: { selection: Selection; entry: Entry }) {
  const { t } = useTranslation();

  if (selection.kind === 'season') {
    return (
      <Stack gap={0} align="flex-end">
        <Text size="sm" ff="monospace" fw={700} c="bright">
          {entry.points}
        </Text>
        <Text size="xs" c="dimmed">
          {t('Tournaments: %{count}', { count: entry.tournaments ?? 0 })}
        </Text>
      </Stack>
    );
  }

  if (selection.period === 'all') {
    return (
      <Text size="sm" ff="monospace" fw={700} c="bright">
        {entry.rating}
      </Text>
    );
  }

  const gain = entry.gain ?? 0;

  return (
    <Stack gap={0} align="flex-end">
      <Text size="sm" ff="monospace" fw={700} className={gain > 0 ? classes.up : gain < 0 ? classes.down : undefined}>
        {gain > 0 ? `+${gain}` : gain}
      </Text>
      <Text size="xs" c="dimmed">
        {t('Wins: %{wins} / %{games}', { wins: entry.wins ?? 0, games: entry.games ?? 0 })}
      </Text>
    </Stack>
  );
}

function Row({ selection, entry, isMe }: { selection: Selection; entry: Entry; isMe: boolean }) {
  return (
    <Group gap="sm" wrap="nowrap" className={classes.row} data-me={isMe || undefined}>
      <span className={classes.position} data-place={entry.position <= 3 ? entry.position : undefined}>
        {entry.position}
      </span>
      <UserAvatar user={entry} size={26} />
      <Stack gap={0} miw={0} flex={1}>
        <Group gap={6} wrap="nowrap" miw={0}>
          <LangIcon lang={entry.lang} />
          <UserCard user={entry}>
            <Text span size="sm" fw={600} c="bright" truncate display="block">
              {entry.name}
            </Text>
          </UserCard>
        </Group>
        {entry.clan && (
          <Text size="xs" c="dimmed" truncate>
            {entry.clan}
          </Text>
        )}
      </Stack>
      <Metric selection={selection} entry={entry} />
    </Group>
  );
}

function TabRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" className={classes.rowLabel}>
        {label}
      </Text>
      <div className={classes.tabs}>{children}</div>
    </Group>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button size="compact-xs" variant={active ? 'light' : 'subtle'} onClick={onClick} className={classes.tab}>
      {children}
    </Button>
  );
}

/** Season standings (last few seasons) and Elo leaderboards (week / month / year / all-time), paginated. */
export function Leaderboard() {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const [selection, setSelection] = useState<Selection>({ kind: 'season', seasonId: null });
  const [page, setPage] = useState(1);

  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: ['leaderboard', selection, page],
    queryFn: () => fetchLeaderboard(selection, page),
    placeholderData: keepPreviousData,
  });

  // Season tabs come with every season response; keep them while an Elo tab is open.
  const { data: seasons = [] } = useQuery({
    queryKey: ['leaderboard-seasons'],
    queryFn: async () => (await fetchJson<LeaderboardPage>('/api/v1/leaderboard/season?page_size=1')).seasons ?? [],
    staleTime: Infinity,
  });

  const select = (next: Selection) => {
    setSelection(next);
    setPage(1);
  };

  const shownSeason = selection.kind === 'season' ? data?.season : null;
  const activeSeasonId = selection.kind === 'season' ? (selection.seasonId ?? seasons[0]?.id) : null;
  const meOnPage = data?.entries.some((entry) => entry.id === user.id);

  const caption =
    selection.kind === 'season'
      ? shownSeason
        ? `${formatDate(shownSeason.starts_at)} – ${formatDate(shownSeason.ends_at)}, ${shownSeason.year}`
        : t('No active season')
      : {
          all: t('Elo rating'),
          week: t('Elo gained this week'),
          month: t('Elo gained this month'),
          year: t('Elo gained this year'),
        }[selection.period];

  const emptyText =
    selection.kind === 'season'
      ? t('No results this season yet.')
      : {
          all: t('Nobody has played yet.'),
          week: t('Nobody has played this week.'),
          month: t('Nobody has played this month.'),
          year: t('Nobody has played this year.'),
        }[selection.period];

  return (
    <Card padding={0}>
      <Stack gap={8} p="md" pb="sm">
        <Group justify="space-between" wrap="nowrap" mb={4} align="flex-start">
          <Group gap={8} wrap="nowrap" miw={0}>
            <Stack gap={0} miw={0}>
              <Title order={5}>{t('Leaderboard')}</Title>
              <Text size="xs" c="dimmed" truncate>
                {caption}
              </Text>
            </Stack>
          </Group>
          {/* Always-visible way into the seasons' history. */}
          <Button
            component="a"
            href="/hall_of_fame"
            variant="light"
            size="compact-xs"
            leftSection={<IconCrown size={12} />}
            rightSection={<IconChevronRight size={12} />}
          >
            {t('Hall of Fame')}
          </Button>
        </Group>

        {seasons.length > 0 && (
          <TabRow label={t('Season')}>
            {seasons.map((season) => (
              <Tooltip key={season.id} label={t('Season %{name}, %{year}', { name: season.name, year: season.year })} openDelay={400}>
                <Tab active={activeSeasonId === season.id} onClick={() => select({ kind: 'season', seasonId: season.id })}>
                  {seasonTabLabel(season)}
                </Tab>
              </Tooltip>
            ))}
          </TabRow>
        )}

        <TabRow label={t('Elo')}>
          {PERIODS.map(({ value, label }) => (
            <Tab
              key={value}
              active={selection.kind === 'elo' && selection.period === value}
              onClick={() => select({ kind: 'elo', period: value })}
            >
              {t(label)}
            </Tab>
          ))}
        </TabRow>
      </Stack>

      <div className={classes.list} data-stale={isPlaceholderData || undefined}>
        {isPending ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : isError ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            {t("Couldn't load the leaderboard.")}
          </Text>
        ) : data.entries.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            {emptyText}
          </Text>
        ) : (
          data.entries.map((entry) => (
            <Row key={entry.id} selection={selection} entry={entry} isMe={entry.id === user.id} />
          ))
        )}

        {data?.me && !meOnPage && (
          <div className={classes.mePinned}>
            <Row selection={selection} entry={data.me} isMe />
          </div>
        )}
      </div>

      {data && data.page_info.total_pages > 1 && (
        <Group justify="center" px="md" py="xs" className={classes.footer}>
          <Pagination size="xs" total={data.page_info.total_pages} value={page} onChange={setPage} siblings={0} boundaries={1} />
        </Group>
      )}
    </Card>
  );
}
