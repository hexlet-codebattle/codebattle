import { Badge, Button, Card, Center, Group, Loader, ScrollArea, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconFlag, IconTrophy } from '@tabler/icons-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { formatCountdown, formatStartsAt, gradeLabel, LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';

import { type CompletedGamePlayer, fetchCompletedGames, fetchTournaments, type PageInfo } from '../api';

import classes from './Profile.module.css';

const nextPage = (info: PageInfo) => (info.page_number < info.total_pages ? info.page_number + 1 : undefined);

function Footer({
  total,
  hasMore,
  loading,
  onMore,
}: {
  total: ReactNode;
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Group justify="space-between" px="md" py="sm" className={classes.tableFooter}>
      <Text size="xs" c="dimmed">
        {total}
      </Text>
      {hasMore && (
        <Button size="compact-sm" onClick={onMore} loading={loading}>
          {t('Load more')}
        </Button>
      )}
    </Group>
  );
}

function State({ children }: { children: ReactNode }) {
  return (
    <Center py="xl">
      <Text size="sm" c="dimmed">
        {children}
      </Text>
    </Center>
  );
}

export function TournamentsTab({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const query = useInfiniteQuery({
    queryKey: ['profile-tournaments', userId],
    queryFn: ({ pageParam }) => fetchTournaments(userId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => nextPage(last.page_info),
  });

  if (query.isPending) return <Center py="xl"><Loader size="sm" /></Center>;
  if (query.isError) return <State>{t('Failed to load tournaments')}</State>;

  const rows = query.data.pages.flatMap((page) => page.tournaments);
  const total = query.data.pages[0]?.page_info.total_entries ?? 0;
  if (rows.length === 0) return <State>{t('No tournaments played yet')}</State>;

  return (
    <Card padding={0}>
      <ScrollArea type="auto">
        <Table highlightOnHover miw={640}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('Tournament')}</Table.Th>
              <Table.Th ta="right">{t('Place')}</Table.Th>
              <Table.Th ta="right">{t('Points')}</Table.Th>
              <Table.Th ta="right">{t('Score')}</Table.Th>
              <Table.Th ta="right">{t('Wins')}</Table.Th>
              <Table.Th ta="right">{t('Time')}</Table.Th>
              <Table.Th>{t('Date')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => {
              const href = `/tournaments/${row.tournament_id}`;
              return (
                <Table.Tr
                  key={row.tournament_id}
                  className={classes.linkRow}
                  onClick={() => window.location.assign(href)}
                >
                  <Table.Td>
                    <Group gap={8} wrap="nowrap" miw={0}>
                      {row.tournament_grade && row.tournament_grade !== 'open' ? (
                        <GradeIcon grade={row.tournament_grade} size={22} />
                      ) : (
                        <Badge size="xs" variant="default">
                          {t('Open')}
                        </Badge>
                      )}
                      <Stack gap={0} miw={0}>
                        <a href={href} className={classes.rowLink} onClick={(event) => event.stopPropagation()}>
                          {row.tournament_name}
                        </a>
                        {row.tournament_grade && row.tournament_grade !== 'open' && (
                          <Text fz={11} c="dimmed">
                            {gradeLabel(row.tournament_grade)}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace" fw={700}>
                    <span className={classes.place} data-place={row.place <= 3 ? row.place : undefined}>
                      #{row.place}
                    </span>
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {row.points}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {row.score}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {row.wins_count}/{row.games_count}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {row.total_time != null ? formatCountdown(row.total_time * 1000) : '—'}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <LangIcon lang={row.user_lang} size={14} />
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {row.tournament_started_at ? formatStartsAt(row.tournament_started_at) : '—'}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Footer
        total={t('Total tournaments: %{count}', { count: total })}
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onMore={() => query.fetchNextPage()}
      />
    </Card>
  );
}

function ResultMark({ result }: { result: string }) {
  const { t } = useTranslation();
  if (result === 'won')
    return (
      <Tooltip label={t('Player won')}>
        <IconTrophy size={14} className={classes.won} />
      </Tooltip>
    );
  if (result === 'gave_up')
    return (
      <Tooltip label={t('Player gave up')}>
        <IconFlag size={14} className={classes.lost} />
      </Tooltip>
    );
  return <span className={classes.markSpacer} />;
}

function PlayerCell({ player, align }: { player?: CompletedGamePlayer; align: 'left' | 'right' }) {
  if (!player) return <span />;

  const diff = player.rating_diff ?? 0;

  return (
    <Group gap={6} wrap="nowrap" miw={0} justify={align === 'right' ? 'flex-end' : 'flex-start'} className={classes.player}>
      <ResultMark result={player.result} />
      <LangIcon lang={player.lang} />
      <UserCard user={player}>
        <Text span size="sm" fw={600} c="bright" truncate display="block">
          {player.name}
        </Text>
      </UserCard>
      {player.rating != null && (
        <Text size="xs" ff="monospace" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {player.rating}
          {diff !== 0 && (
            <span className={diff > 0 ? classes.won : classes.lost}>
              {' '}
              {diff > 0 ? `+${diff}` : diff}
            </span>
          )}
        </Text>
      )}
    </Group>
  );
}

export function GamesTab({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const query = useInfiniteQuery({
    queryKey: ['profile-games', userId],
    queryFn: ({ pageParam }) => fetchCompletedGames(userId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => nextPage(last.page_info),
  });

  if (query.isPending) return <Center py="xl"><Loader size="sm" /></Center>;
  if (query.isError) return <State>{t('Failed to load games')}</State>;

  const games = query.data.pages.flatMap((page) => page.games);
  const total = query.data.pages[0]?.page_info.total_entries ?? 0;
  if (games.length === 0) return <State>{t('No completed games')}</State>;

  return (
    <Card padding={0}>
      {games.map((game) => {
        const [first, second] = game.players;
        return (
          <div key={game.id} className={classes.gameRow}>
            <Badge size="sm" variant="light" color={LEVEL_COLORS[game.level]} className={classes.level}>
              {levelLabel(game.level)}
            </Badge>
            <div className={classes.players}>
              <PlayerCell player={first} align="right" />
              <Text size="xs" c="dimmed" fw={700} ff="monospace">
                VS
              </Text>
              <PlayerCell player={second} align="left" />
            </div>
            <Text size="xs" c="dimmed" className={classes.date}>
              {game.finishes_at ? formatStartsAt(game.finishes_at) : '—'}
            </Text>
            <Button component="a" href={`/games/${game.id}`} size="compact-xs" className={classes.show}>
              {t('Show')}
            </Button>
          </div>
        );
      })}
      <Footer
        total={t('Total games: %{count}', { count: total })}
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onMore={() => query.fetchNextPage()}
      />
    </Card>
  );
}
