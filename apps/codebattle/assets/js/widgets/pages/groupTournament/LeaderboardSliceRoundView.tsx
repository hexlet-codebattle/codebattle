import React, { useMemo, useState } from 'react';
import { Button, Flex, Text } from '@mantine/core';
import i18n from '../../../i18n';
import { LEADERBOARD_SLICE_VIEW_INITIAL_LIMIT } from '../../config/groupTournament';
import LeaderboardSliceItem from './LeaderboardSliceItem';
import { type LeaderboardEntry, type SlicePlayer } from './types';

interface LeaderboardSliceRoundViewProps {
  leaderboard: LeaderboardEntry[];
  roundNumber: number;
  currentUserId?: number;
}

interface SliceGroup {
  sliceIndex: number;
  players: SlicePlayer[];
  hasCurrentUser: boolean;
}

function LeaderboardSliceRoundView({
  leaderboard,
  roundNumber,
  currentUserId,
}: LeaderboardSliceRoundViewProps) {
  const [showAll, setShowAll] = useState(false);

  const slices = useMemo<SliceGroup[]>(() => {
    const bySlice = new Map<number, SlicePlayer[]>();

    leaderboard.forEach((entry) => {
      const cell = entry.rounds && entry.rounds[roundNumber];
      if (!cell || !Number.isInteger(cell.sliceIndex)) return;
      const arr = bySlice.get(cell.sliceIndex as number) || [];
      arr.push({
        userId: entry.userId,
        name: entry.name || `#${entry.userId}`,
        clan: entry.clan,
        place: cell.place,
        score: cell.score ?? 0,
      });
      bySlice.set(cell.sliceIndex as number, arr);
    });

    const all = Array.from(bySlice.entries())
      .sort(([a], [b]) => a - b)
      .map(([sliceIndex, players]) => ({
        sliceIndex,
        players: players.slice().sort((a, b) => {
          const pa = Number.isInteger(a.place) ? (a.place as number) : Number.MAX_SAFE_INTEGER;
          const pb = Number.isInteger(b.place) ? (b.place as number) : Number.MAX_SAFE_INTEGER;
          if (pa !== pb) return pa - pb;
          if (b.score !== a.score) return b.score - a.score;
          return a.userId - b.userId;
        }),
        hasCurrentUser:
          Number.isInteger(currentUserId) && players.some((p) => p.userId === currentUserId),
      }));

    const currentIdx = all.findIndex((s) => s.hasCurrentUser);
    if (currentIdx > 0) {
      const [pinned] = all.splice(currentIdx, 1);
      all.unshift(pinned);
    }
    return all;
  }, [leaderboard, roundNumber, currentUserId]);

  if (slices.length === 0) {
    return (
      <Text c="dimmed" p="md">
        {i18n.t('No round data yet')}
      </Text>
    );
  }

  const overLimit = slices.length > LEADERBOARD_SLICE_VIEW_INITIAL_LIMIT;
  const visibleSlices =
    overLimit && !showAll ? slices.slice(0, LEADERBOARD_SLICE_VIEW_INITIAL_LIMIT) : slices;

  return (
    <>
      {overLimit && (
        <Flex align="center" mb="sm">
          <Text c="dimmed" size="sm" mr="sm">
            {showAll
              ? i18n.t('%{count} slices', { count: slices.length })
              : i18n.t('%{visible} / %{total} slices', {
                  visible: visibleSlices.length,
                  total: slices.length,
                })}
          </Text>
          <Button
            type="button"
            size="compact-sm"
            variant="default"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? i18n.t('Show less') : i18n.t('Show all')}
          </Button>
        </Flex>
      )}
      <Flex wrap="wrap" gap="md">
        {visibleSlices.map(({ sliceIndex, players, hasCurrentUser }) => (
          <LeaderboardSliceItem
            key={sliceIndex}
            sliceIndex={sliceIndex}
            players={players}
            hasCurrentUser={hasCurrentUser}
            currentUserId={currentUserId}
          />
        ))}
      </Flex>
    </>
  );
}

export default LeaderboardSliceRoundView;
