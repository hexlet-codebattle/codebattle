import React, { useEffect, memo, useState } from 'react';

import { Text } from '@mantine/core';
import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';
import { type TournamentState } from '@/slices/initial';

import i18n from '../../../i18n';
import TournamentStates from '../../config/tournament';
import { getResults } from '../../middlewares/Tournament';

import FinishedLeaderboard, { type LeaderboardItem } from './FinishedLeaderboard';
import PlayersRankingPanel from './PlayersRankingPanel';

interface LeaderboardPanelProps {
  canModerate?: boolean;
  state: string;
  ranking?: TournamentState['ranking'];
  playersCount: number;
}

function LeaderboardPanel({
  canModerate = false,
  state,
  ranking,
  playersCount,
}: LeaderboardPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[] | null>(null);

  useEffect(() => {
    if (state === TournamentStates.finished) {
      console.log('Tournament finished, fetching leaderboard...');
      dispatch(
        getResults('leaderboard', {}, (data: LeaderboardItem[]) => {
          console.log('Leaderboard fetched');
          setLeaderboard(data);
        }),
      );
    }
  }, [state, dispatch]);

  if (state === TournamentStates.finished && leaderboard && leaderboard.length > 0) {
    return <FinishedLeaderboard leaderboard={leaderboard} />;
  }

  if (ranking) {
    return (
      <PlayersRankingPanel
        canModerate={canModerate}
        playersCount={playersCount}
        ranking={ranking}
      />
    );
  }

  return (
    <Text ta="center" c="dimmed" mt="xl">
      {i18n.t('No leaderboard data available')}
    </Text>
  );
}

export default memo(LeaderboardPanel);
