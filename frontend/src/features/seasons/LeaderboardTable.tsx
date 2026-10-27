import {
  ActionIcon,
  Button,
  Card,
  Group,
  Pagination,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconChartBar, IconCurrentLocation, IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatSeconds } from '@/features/tasks/shared';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon, langName } from '@/shared/LangIcon';
import { SortTh, useSort } from '@/shared/sortable';
import { usePage } from '@/shared/usePage';
import { UserAvatar } from '@/shared/UserAvatar';
import { useSharedProps } from '@/shared/useSharedProps';

import classes from './Seasons.module.css';
import { avgPlace, type SeasonResult } from './types';

const PAGE_SIZES = ['25', '50', '100'];

const ACCESSORS = {
  place: (row: SeasonResult) => row.place,
  user_name: (row: SeasonResult) => row.user_name,
  clan_name: (row: SeasonResult) => row.clan_name,
  total_points: (row: SeasonResult) => row.total_points,
  total_wins_count: (row: SeasonResult) => row.total_wins_count,
  total_games_count: (row: SeasonResult) => row.total_games_count,
  total_score: (row: SeasonResult) => row.total_score,
  tournaments_count: (row: SeasonResult) => row.tournaments_count,
  avg_place: (row: SeasonResult) => avgPlace(row.avg_place),
  best_place: (row: SeasonResult) => row.best_place,
  total_time: (row: SeasonResult) => row.total_time,
};

type Column = keyof typeof ACCESSORS;

// Right-aligned numeric columns after the player/clan ones.
const NUMERIC: Column[] = [
  'total_points',
  'total_wins_count',
  'total_games_count',
  'total_score',
  'tournaments_count',
  'avg_place',
  'best_place',
  'total_time',
];

export function PlaceChip({ place }: { place: number }) {
  return (
    <span className={classes.place} data-place={place >= 1 && place <= 3 ? place : undefined}>
      {place}
    </span>
  );
}

interface LeaderboardTableProps {
  results: SeasonResult[];
  onInsights: (result: SeasonResult) => void;
  title: string;
  /** Note under the title, e.g. "Top 100". */
  caption?: string;
}

/** Season standings: search, clan/language filters, sortable columns, paging, "find me". */
export function LeaderboardTable({ results, onInsights, title, caption }: LeaderboardTableProps) {
  const { t } = useTranslation();
  const labels: Record<Column, string> = {
    place: t('Place'),
    user_name: t('Player'),
    clan_name: t('Clan'),
    total_points: t('Points'),
    total_wins_count: t('Wins'),
    total_games_count: t('Games'),
    total_score: t('Score'),
    tournaments_count: t('Tournaments'),
    avg_place: t('Avg Place'),
    best_place: t('Best Finish'),
    total_time: t('Time Played'),
  };
  const { current_user: me } = useSharedProps();
  const [query, setQuery] = useState('');
  const [clan, setClan] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState('50');
  const [flashId, setFlashId] = useState<number | null>(null);

  const clans = useMemo(
    () => [...new Set(results.map((row) => row.clan_name).filter((name): name is string => Boolean(name)))].sort(),
    [results],
  );
  const langs = useMemo(
    () => [...new Set(results.map((row) => row.user_lang).filter((name): name is string => Boolean(name)))].sort(),
    [results],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return results.filter(
      (row) =>
        (!needle || row.user_name.toLowerCase().includes(needle)) &&
        (!clan || row.clan_name === clan) &&
        (!lang || row.user_lang === lang),
    );
  }, [results, query, clan, lang]);

  const { sorted, sort, toggle } = useSort<SeasonResult, Column>(filtered, ACCESSORS, { key: 'place', dir: 'asc' });
  // Back to page 1 whenever the filter or order changes.
  const [page, setPage] = usePage(JSON.stringify([query, clan, lang, sort, pageSize]));

  const size = Number(pageSize);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const shown = sorted.slice((page - 1) * size, page * size);
  const filtering = Boolean(query || clan || lang);
  const mine = results.find((row) => row.user_id === me.id);

  const reset = () => {
    setQuery('');
    setClan(null);
    setLang(null);
  };

  const findMe = () => {
    if (!mine) return;
    reset();
    const index = [...results].sort((a, b) => a.place - b.place).findIndex((row) => row.user_id === me.id);
    // Wait for the reset (which jumps to page 1) before moving to my page.
    setTimeout(() => {
      setPage(Math.floor(index / size) + 1);
      setFlashId(me.id);
    });
  };

  // Scroll to the highlighted row once its page has rendered.
  useEffect(() => {
    if (flashId != null) document.getElementById(`season-row-${flashId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [flashId, page]);

  return (
    <Card padding={0}>
      <Group justify="space-between" p="md" pb="sm" gap="sm">
        <div>
          <Text fw={700} fz="lg" c="bright">
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {caption ?? t('%{count} players', { count: results.length })}
          </Text>
        </div>
        <Group gap="xs">
          <TextInput
            size="xs"
            w={180}
            leftSection={<IconSearch size={14} />}
            placeholder={t('Search by name...')}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            aria-label={t('Search player')}
          />
          <Select
            size="xs"
            w={150}
            placeholder={t('All Clans')}
            data={clans}
            value={clan}
            onChange={setClan}
            searchable
            clearable
            aria-label={t('Filter by clan')}
          />
          <Select
            size="xs"
            w={150}
            placeholder={t('All Languages')}
            data={langs.map((value) => ({ value, label: langName(value) }))}
            value={lang}
            onChange={setLang}
            clearable
            leftSection={lang ? <LangIcon lang={lang} size={14} withTooltip={false} /> : undefined}
            renderOption={({ option }) => (
              <Group gap={8} wrap="nowrap">
                <LangIcon lang={option.value} size={14} withTooltip={false} />
                {option.label}
              </Group>
            )}
            aria-label={t('Filter by language')}
          />
          {filtering && (
            <Button size="xs" variant="subtle" leftSection={<IconX size={14} />} onClick={reset}>
              {t('Clear Filters')}
            </Button>
          )}
          {mine && (
            <Button size="xs" variant="default" leftSection={<IconCurrentLocation size={14} />} onClick={findMe}>
              {t('Find me · #%{place}', { place: mine.place })}
            </Button>
          )}
        </Group>
      </Group>

      <Table.ScrollContainer minWidth={980}>
        <Table className={classes.table} verticalSpacing={5} horizontalSpacing="sm" fz="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <SortTh column="place" sort={sort} onSort={toggle} w={70}>
                {labels.place}
              </SortTh>
              <SortTh column="user_name" sort={sort} onSort={toggle}>
                {labels.user_name}
              </SortTh>
              <SortTh column="clan_name" sort={sort} onSort={toggle}>
                {labels.clan_name}
              </SortTh>
              {NUMERIC.map((column) => (
                <SortTh key={column} column={column} sort={sort} onSort={toggle} ta="right">
                  {labels[column]}
                </SortTh>
              ))}
              <Table.Th w={44} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={NUMERIC.length + 4}>
                  <Text size="sm" c="dimmed" ta="center" py="lg">
                    {results.length === 0 ? t('No results yet') : t('No players match your filters')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              shown.map((row) => {
                const user = { id: row.user_id, name: row.user_name, avatar_url: row.avatar_url, lang: row.user_lang };
                const average = avgPlace(row.avg_place);

                return (
                  <Table.Tr
                    key={row.user_id}
                    id={`season-row-${row.user_id}`}
                    data-me={row.user_id === me.id || undefined}
                    data-flash={row.user_id === flashId || undefined}
                    onAnimationEnd={() => setFlashId(null)}
                  >
                    <Table.Td>
                      <PlaceChip place={row.place} />
                    </Table.Td>
                    <Table.Td maw={240}>
                      <Group gap={8} wrap="nowrap">
                        <UserAvatar user={user} size={24} />
                        <LangIcon lang={row.user_lang} />
                        <UserCard user={user}>
                          <Text span size="sm" fw={600} c="bright" truncate>
                            {row.user_name}
                          </Text>
                        </UserCard>
                      </Group>
                    </Table.Td>
                    <Table.Td maw={180}>
                      <Text size="sm" c="dimmed" truncate>
                        {row.clan_name ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" fw={700} c="bright">
                      {row.total_points}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {row.total_wins_count}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" c="dimmed">
                      {row.total_games_count}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {row.total_score}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace">
                      {row.tournaments_count}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" c="dimmed">
                      {average == null ? '—' : average.toFixed(1)}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" c="dimmed">
                      {row.best_place ?? '—'}
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" c="dimmed">
                      {formatSeconds(row.total_time)}
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t('View player insights')} openDelay={300}>
                        <ActionIcon size="sm" variant="subtle" onClick={() => onInsights(row)} aria-label={t('View player insights')}>
                          <IconChartBar size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {sorted.length > 25 && (
        <Group justify="space-between" px="md" py="xs" style={{ borderTop: '1px solid var(--cb-border)' }}>
          <Group gap={6}>
            <Text size="xs" c="dimmed">
              {t('Show')}
            </Text>
            <Select
              size="xs"
              w={76}
              data={PAGE_SIZES}
              value={pageSize}
              onChange={(value) => value && setPageSize(value)}
              allowDeselect={false}
              aria-label={t('Rows per page')}
            />
            <Text size="xs" c="dimmed">
              {t('of %{count} players', { count: sorted.length })}
            </Text>
          </Group>
          {pages > 1 && <Pagination size="sm" total={pages} value={page} onChange={setPage} siblings={1} boundaries={1} />}
        </Group>
      )}
    </Card>
  );
}
