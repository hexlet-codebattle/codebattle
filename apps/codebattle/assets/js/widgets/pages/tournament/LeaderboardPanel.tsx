import React, { useEffect, memo, useState } from 'react';

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
    <div className="text-center text-muted mt-4">{i18n.t('No leaderboard data available')}</div>
  );
}

export default memo(LeaderboardPanel);
