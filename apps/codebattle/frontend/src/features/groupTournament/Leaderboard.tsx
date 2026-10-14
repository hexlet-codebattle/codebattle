import { Anchor, Badge, Button, Group, Pagination, ScrollArea, SegmentedControl, Table, Text } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceChip } from '@/features/seasons/LeaderboardTable';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';

import type { LeaderboardEntry, RoundCell } from './types';
import { roundLabel } from './utils';
import classes from './GroupTournament.module.css';

const PAGE_SIZE = 50;
const SLICES_INITIAL_LIMIT = 24;

function PlayerName({ entry }: { entry: Pick<LeaderboardEntry, 'user_id' | 'name' | 'lang' | 'avatar_url'> }) {
  const name = entry.name || `#${entry.user_id}`;
  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      <LangIcon lang={entry.lang} />
      <UserCard user={{ id: entry.user_id, name, avatar_url: entry.avatar_url }}>
        <Text span size="sm" fw={600} c="bright" truncate title={name}>
          {name}
        </Text>
      </UserCard>
    </Group>
  );
}

function ClanName({ entry }: { entry: Pick<LeaderboardEntry, 'clan' | 'clan_id'> }) {
  if (!entry.clan) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }
  return entry.clan_id ? (
    <Anchor href={`/clans/${entry.clan_id}`} size="sm" c="dimmed" truncate display="block" title={entry.clan}>
      {entry.clan}
    </Anchor>
  ) : (
    <Text size="sm" c="dimmed" truncate title={entry.clan}>
      {entry.clan}
    </Text>
  );
}

function RoundCellView({ cell }: { cell: RoundCell | undefined }) {
  if (!cell) {
    return (
      <Table.Td ta="center" c="dimmed">
        —
      </Table.Td>
    );
  }
  const meta = [cell.slice_index != null ? `S${cell.slice_index + 1}` : '', cell.place != null ? `#${cell.place}` : ''].filter(Boolean);
  return (
    <Table.Td ta="center" ff="monospace" title={meta.join(' · ')} style={{ whiteSpace: 'nowrap' }}>
      <Text span inherit fw={700}>
        {cell.score ?? 0}
      </Text>
      {meta.length > 0 && (
        <Text span size="xs" c="dimmed" ml={4}>
          {meta.join('·')}
        </Text>
      )}
    </Table.Td>
  );
}

/** Overall standings: total and per-round points (slice · place). */
function RatingTable({ leaderboard, rounds, userId }: { leaderboard: LeaderboardEntry[]; rounds: number[]; userId: number }) {
  const { t } = useTranslation();
  const myIndex = leaderboard.findIndex((entry) => entry.user_id === userId);
  const [page, setPage] = useState(() => (myIndex >= 0 ? Math.floor(myIndex / PAGE_SIZE) + 1 : 1));
  const pages = Math.ceil(leaderboard.length / PAGE_SIZE);
  const offset = (Math.min(page, pages) - 1) * PAGE_SIZE;
  const shown = leaderboard.slice(offset, offset + PAGE_SIZE);

  return (
    <>
      <Table.ScrollContainer minWidth={520 + rounds.length * 90}>
        <Table verticalSpacing={5} horizontalSpacing="sm" fz="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={60}>{t('Place')}</Table.Th>
              <Table.Th>{t('Player')}</Table.Th>
              <Table.Th>{t('Clan')}</Table.Th>
              <Table.Th ta="center">{t('Slice')}</Table.Th>
              {rounds.map((round) => (
                <Table.Th key={round} ta="center" style={{ whiteSpace: 'nowrap' }}>
                  {roundLabel(round)}
                </Table.Th>
              ))}
              <Table.Th ta="right">{t('Total')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.map((entry, index) => {
              const place = offset + index + 1;
              return (
                <Table.Tr key={entry.user_id} className={classes.row} data-me={entry.user_id === userId || undefined} data-left={entry.state === 'left' || undefined}>
                  <Table.Td>
                    <PlaceChip place={place} />
                  </Table.Td>
                  <Table.Td maw={240}>
                    <Group gap={6} wrap="nowrap">
                      <PlayerName entry={entry} />
                      {entry.state === 'left' && (
                        <Badge size="xs" variant="default" style={{ flex: 'none' }}>
                          {t('Left')}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td maw={160}>
                    <ClanName entry={entry} />
                  </Table.Td>
                  <Table.Td ta="center" ff="monospace">
                    {entry.slice_index != null ? entry.slice_index + 1 : '—'}
                  </Table.Td>
                  {rounds.map((round) => (
                    <RoundCellView key={round} cell={entry.rounds?.[String(round)]} />
                  ))}
                  <Table.Td ta="right" ff="monospace" fw={700} c="bright">
                    {entry.total_score ?? 0}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {pages > 1 && (
        <Group justify="space-between" px="sm" py="xs" className={classes.tableFooter}>
          <Text size="xs" c="dimmed">
            {t('Total players: %{count}', { count: leaderboard.length })}
          </Text>
          <Pagination size="xs" total={pages} value={Math.min(page, pages)} onChange={setPage} siblings={1} />
        </Group>
      )}
    </>
  );
}

interface SlicePlayer {
  user_id: number;
  name: string | null;
  avatar_url: string | null;
  lang?: string | null;
  clan: string | null;
  clan_id: number | null;
  place: number | null;
  score: number;
}

/** One round as slice cards (players by place); my slice first. */
function SliceRoundView({ leaderboard, round, userId }: { leaderboard: LeaderboardEntry[]; round: number; userId: number }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const slices = useMemo(() => {
    const bySlice = new Map<number, SlicePlayer[]>();
    leaderboard.forEach((entry) => {
      const cell = entry.rounds?.[String(round)];
      if (cell?.slice_index == null) return;
      const list = bySlice.get(cell.slice_index) ?? [];
      list.push({ ...entry, place: cell.place, score: cell.score ?? 0 });
      bySlice.set(cell.slice_index, list);
    });

    const all = [...bySlice.entries()]
      .sort(([a], [b]) => a - b)
      .map(([sliceIndex, players]) => ({
        sliceIndex,
        players: players.sort(
          (a, b) => (a.place ?? Number.MAX_SAFE_INTEGER) - (b.place ?? Number.MAX_SAFE_INTEGER) || b.score - a.score || a.user_id - b.user_id,
        ),
        mine: players.some((player) => player.user_id === userId),
      }));

    const mineIndex = all.findIndex((slice) => slice.mine);
    if (mineIndex > 0) all.unshift(...all.splice(mineIndex, 1));
    return all;
  }, [leaderboard, round, userId]);

  if (slices.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="md" size="sm">
        {t('No round data yet')}
      </Text>
    );
  }

  const overLimit = slices.length > SLICES_INITIAL_LIMIT;
  const visible = overLimit && !showAll ? slices.slice(0, SLICES_INITIAL_LIMIT) : slices;

  return (
    <div>
      {overLimit && (
        <Group gap="xs" mb="xs">
          <Text size="xs" c="dimmed">
            {showAll
              ? t('%{count} slices', { count: slices.length })
              : t('%{visible} / %{total} slices', { visible: visible.length, total: slices.length })}
          </Text>
          <Button size="compact-xs" variant="default" onClick={() => setShowAll((value) => !value)}>
            {showAll ? t('Show less') : t('Show all')}
          </Button>
        </Group>
      )}
      <div className={classes.sliceGrid}>
        {visible.map(({ sliceIndex, players, mine }) => (
          <div key={sliceIndex} className={classes.sliceCard} data-mine={mine || undefined}>
            <Group justify="space-between" gap="xs" className={classes.sliceHead}>
              <Group gap={6}>
                <Text size="sm" fw={700}>{`${t('Slice')} ${sliceIndex + 1}`}</Text>
                {mine && (
                  <Badge size="xs" variant="light" color="green">
                    {t('You')}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {t('%{count} players', { count: players.length })}
              </Text>
            </Group>
            <Table verticalSpacing={3} horizontalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={44}>{t('Place')}</Table.Th>
                  <Table.Th>{t('Player')}</Table.Th>
                  <Table.Th>{t('Clan')}</Table.Th>
                  <Table.Th ta="right">{t('Score')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {players.map((player, index) => (
                  <Table.Tr key={player.user_id} className={classes.row} data-me={player.user_id === userId || undefined}>
                    <Table.Td ff="monospace">{player.place ?? index + 1}</Table.Td>
                    <Table.Td maw={160}>
                      <PlayerName entry={player} />
                    </Table.Td>
                    <Table.Td maw={110}>
                      <ClanName entry={player} />
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" fw={700}>
                      {player.score}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  roundsCount: number;
  userId: number;
}

/** Standings, plus one view per round showing its slices. */
export function Leaderboard({ leaderboard, roundsCount, userId }: LeaderboardProps) {
  const { t } = useTranslation();
  const [view, setView] = useState('rating');
  const rounds = useMemo(() => Array.from({ length: Math.max(roundsCount, 0) }, (_, index) => index + 1), [roundsCount]);

  return (
    <div>
      {rounds.length > 0 && (
        <ScrollArea type="hover" scrollbarSize={4} offsetScrollbars="x" mb="xs">
          <SegmentedControl
            size="xs"
            value={view}
            onChange={setView}
            data={[{ value: 'rating', label: t('Leaderboard') }, ...rounds.map((round) => ({ value: String(round), label: roundLabel(round) }))]}
          />
        </ScrollArea>
      )}
      {view === 'rating' ? (
        <RatingTable leaderboard={leaderboard} rounds={rounds} userId={userId} />
      ) : (
        <SliceRoundView key={view} leaderboard={leaderboard} round={Number(view)} userId={userId} />
      )}
    </div>
  );
}
