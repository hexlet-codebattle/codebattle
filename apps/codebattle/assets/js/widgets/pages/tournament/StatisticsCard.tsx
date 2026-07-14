import React, { memo, useMemo } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { tournamentPlayerSelector } from '@/selectors';
import useMatchesStatistics from '@/utils/useMatchesStatistics';

import i18next from '../../../i18n';

type StatisticsCardMatch = Parameters<typeof useMatchesStatistics>[1][number];

interface StatisticsCardProps {
  playerId: number;
  matchList?: StatisticsCardMatch[];
  compact?: boolean;
}

function StatisticsCard({ playerId, matchList = [], compact = false }: StatisticsCardProps) {
  const [playerStats] = useMatchesStatistics(playerId, matchList);
  const player = useSelector(tournamentPlayerSelector(playerId)) as
    | { place?: number | string; score?: number }
    | undefined;
  const noWinnerCount =
    matchList.length - playerStats.winMatches.length - playerStats.lostMatches.length;
  const finishedMatches = useMemo(
    () => matchList.filter((match) => !!match.playerResults?.[playerId]),
    [matchList, playerId],
  );
  const avgResultPercent = finishedMatches.length ? playerStats.avgTests.toFixed(1) : '0.0';

  return (
    <div className={cn('cb-player-stats-bar cb-bg-highlight-panel cb-rounded', compact && 'w-100')}>
      <div className="cb-player-stat cb-player-stat--place">
        <span className="cb-player-stat-label">{i18next.t('Place')}</span>
        <span className="cb-player-stat-value">{player?.place ?? '?'}</span>
      </div>
      <div className="cb-player-stat cb-player-stat--score">
        <span className="cb-player-stat-label">{i18next.t('Score')}</span>
        <span className="cb-player-stat-value">{player?.score ?? 0}</span>
      </div>
      <div className="cb-player-stat">
        <span className="cb-player-stat-label">{i18next.t('Avg Result')}</span>
        <span className="cb-player-stat-value">{avgResultPercent}%</span>
      </div>
      <div className="cb-player-stat cb-player-stat--record">
        <span className="cb-player-stat-label">{i18next.t('Record')}</span>
        <span className="cb-player-stat-value cb-player-record">
          <span className="cb-player-record-win">{playerStats.winMatches.length}W</span>
          <span className="cb-player-record-sep">·</span>
          <span className="cb-player-record-loss">{playerStats.lostMatches.length}L</span>
          <span className="cb-player-record-sep">·</span>
          <span className="cb-player-record-draw">{noWinnerCount}D</span>
        </span>
      </div>
    </div>
  );
}

export default memo(StatisticsCard);
