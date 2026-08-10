import React, { useMemo, useState } from 'react';
import { Box } from '@mantine/core';
import LeaderboardHeader from './LeaderboardHeader';
import LeaderboardTabs from './LeaderboardTabs';
import LeaderboardRatingTable from './LeaderboardRatingTable';
import LeaderboardSliceRoundView from './LeaderboardSliceRoundView';
import { type LeaderboardEntry } from './types';

interface LeaderboardProps {
  leaderboard?: LeaderboardEntry[];
  roundsCount?: number;
  currentRoundPosition?: number;
  isFinished?: boolean;
  currentUserId?: number;
}

function Leaderboard({
  leaderboard,
  roundsCount,
  currentRoundPosition,
  isFinished,
  currentUserId,
}: LeaderboardProps) {
  const rounds = useMemo<number[]>(() => {
    if (!Number.isInteger(roundsCount) || (roundsCount as number) < 1) return [];
    return Array.from({ length: roundsCount as number }, (_, i) => i + 1);
  }, [roundsCount]);

  const [activeTab, setActiveTab] = useState('rating');

  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    return null;
  }

  return (
    <Box
      mt="lg"
      p="md"
      w="100%"
      className="cb-group-tournament-leaderboard-container"
      style={{ overflow: 'auto' }}
    >
      <Box p="md" className="cb-rounded" style={{ overflow: 'auto' }}>
        <Box my="sm">
          <Box
            py="sm"
            pos="relative"
            style={{
              maxHeight: '100%',
              borderTopLeftRadius: '0.25rem',
              borderBottomLeftRadius: '0.25rem',
            }}
          >
            <LeaderboardHeader
              currentRoundPosition={currentRoundPosition}
              roundsCount={roundsCount}
            />
            <LeaderboardTabs activeTab={activeTab} setActiveTab={setActiveTab} rounds={rounds} />
            {activeTab !== 'rating' ? (
              <Box px="md" py="sm">
                <LeaderboardSliceRoundView
                  leaderboard={leaderboard}
                  roundNumber={Number(activeTab.replace('round-', ''))}
                  currentUserId={currentUserId}
                />
              </Box>
            ) : (
              <LeaderboardRatingTable
                leaderboard={leaderboard}
                rounds={rounds}
                currentUserId={currentUserId}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Leaderboard;
