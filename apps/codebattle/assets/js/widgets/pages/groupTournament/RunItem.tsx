import React, { useMemo } from 'react';
import cn from 'classnames';
import { Box, Flex, Text } from '@mantine/core';
import i18n from '../../../i18n';
import {
  formatDuration,
  isSliceRun,
  isRoundRun,
  getPlaceFor,
  getTitleForRun,
} from '../../utils/groupTournament';
import { type Run, type LeaderboardEntry } from './types';

interface RunItemProps {
  item: Run;
  items: Run[];
  runId?: number | string;
  setRunId: (id: number | string) => void;
  leaderboard?: LeaderboardEntry[];
  currentUserId?: number;
}

const mutedColor = 'rgba(255, 255, 255, 0.5)';

const RunItem = ({ item, items, runId, setRunId, leaderboard, currentUserId }: RunItemProps) => {
  const isActive = runId === item.id;
  const onClick = () => setRunId(item.id);

  const title = useMemo(() => getTitleForRun(item, items), [item, items]);

  const myEntry = useMemo(() => {
    if (!Number.isInteger(currentUserId) || !Array.isArray(leaderboard)) return null;
    return leaderboard.find((e) => e.userId === currentUserId) || null;
  }, [leaderboard, currentUserId]);

  const pending = item.status === 'pending' || item.isStub;
  const roundRun = isRoundRun(item);
  const place = roundRun ? (item.place ?? getPlaceFor(item, myEntry)) : null;
  const duration = formatDuration(item.durationMs as number);
  const sliceLabel =
    !item.isStub && isSliceRun(item) && Number.isInteger(item.sliceIndex)
      ? i18n.t('Group %{n}', { n: (item.sliceIndex as number) + 1 })
      : null;

  const isDisabled = item.isStub || item.status === 'error' || item.status === 'timeout';

  const buttonClasses = cn('cb-run-item', {
    'cb-run-item--group': roundRun,
    'cb-run-item--test': !roundRun,
    'cb-run-item--active': isActive,
    'cb-run-item--error': item.status === 'error',
    'cb-run-item--timeout': item.status === 'timeout',
    'cb-run-item--pending': pending,
    'cb-run-item--disabled': isDisabled,
  });

  return (
    <Box key={item.id} mb="sm">
      <button type="button" disabled={isDisabled} onClick={onClick} className={buttonClasses}>
        <Flex align="center" justify="space-between" w="100%">
          <Text span fw={700} mr="sm">
            {title}
          </Text>
          {sliceLabel && (
            <Text span size="sm" c={isActive ? mutedColor : 'dimmed'}>
              {sliceLabel}
            </Text>
          )}
        </Flex>
        <Flex
          wrap="wrap"
          align="center"
          fz="sm"
          mt="xs"
          w="100%"
          c={isActive ? mutedColor : 'dimmed'}
        >
          {item.isStub ? null : pending ? (
            i18n.t('Running…')
          ) : (
            <>
              <Text span fw={700} mr="md" style={{ whiteSpace: 'nowrap', opacity: 0.75 }}>
                {item.status === 'error' && i18n.t('Error')}
                {item.status === 'timeout' && i18n.t('Time Limit')}
                {item.status !== 'error' &&
                  item.status !== 'timeout' &&
                  i18n.t('Score: %{score}', { score: item.score ?? 0 })}
              </Text>
              {roundRun && place && (
                <Text span fw={700} ml="auto" style={{ whiteSpace: 'nowrap', opacity: 0.75 }}>
                  {Number.isInteger(place)
                    ? i18n.t('Place: #%{place}', { place })
                    : i18n.t('Place: pending')}
                </Text>
              )}
              {duration && !roundRun && (
                <Text span ml="auto" style={{ whiteSpace: 'nowrap' }}>
                  {i18n.t('Time: %{duration}', { duration })}
                </Text>
              )}
            </>
          )}
        </Flex>
      </button>
    </Box>
  );
};

export default RunItem;
