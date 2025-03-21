import React, { memo, useContext } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import useMatchesStatistics from '@/utils/useMatchesStatistics';

import i18next from '../../../i18n';

import TournamentPlace from './TournamentPlace';

export function ArenaStatisticsCard({
  playerId,
  taskIds = [],
  matchList = [],
  clanId,
}) {
  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const [playerStats] = useMatchesStatistics(playerId, matchList);
  const clanStats = useSelector(state => {
    if (Array.isArray(state.tournament.ranking)) {
      return state.tournament.ranking.find(({ id }) => id === clanId);
    }

    return state.tournament.ranking?.entries?.find(({ id }) => id === clanId);
  });

  const timeoutGamesLength = matchList.filter(({ state }) => state !== 'playing').length
    - playerStats.winMatches.length
    - playerStats.lostMatches.length;

  const cardClassName = cn(
    'd-flex flex-column justify-content-center p-2 w-100',
    // 'align-items-center align-items-md-baseline align-items-lg-baseline align-items-xl-baseline',
    'align-items-center',
  );
  const cardColumnClassName = cn('d-flex flex-column', 'align-items-baseline');

  return (
    <div className={cardClassName}>
      <div className="d-flex w-100 justify-content-between">
        <div className={cardColumnClassName}>
          <span className="p-1">{`${i18next.t('Your clan place')}: ${clanStats?.place || '?'}`}</span>
          {/* <span className="p-1">{`${i18next.t('Your place')}: ${playerStats.place || '?'}`}</span> */}
          <span className="p-1">{`${i18next.t('Task')}: ${playerStats.matchesCount}/${taskIds.length}`}</span>
        </div>
        <div className={cardColumnClassName}>
          <span className="p-1">{`${i18next.t('Your clan score')}: ${clanStats?.score || '?'}`}</span>
          <span className="p-1">{`${i18next.t('Your score')}: ${playerStats.score || '?'}`}</span>
        </div>
      </div>
      <div className="d-flex flex-column w-100">
        <span className="p-1">{`${i18next.t('Statistics')}:`}</span>
        <div className="d-flex justify-content-between">
          <span
            className={cn('p-1', {
              'text-success': !hasCustomEventStyles,
              'cb-custom-event-text-success': hasCustomEventStyles,
            })}
          >
            <span className="pr-1">{i18next.t('Wins')}</span>
            {playerStats.winMatches.length}
          </span>
          <span
            className={cn('p-1', {
              'text-danger': !hasCustomEventStyles,
              'cb-custom-event-text-danger': hasCustomEventStyles,
            })}
          >
            <span className="pr-1">{i18next.t('Loses')}</span>
            {playerStats.lostMatches.length}
          </span>
          <span className={cn('p-1 text-muted')}>
            <span className="pr-1">{i18next.t('Timeout')}</span>
            {timeoutGamesLength}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatisticsCard({
 playerId, taskIds = [], matchList = [], place,
}) {
  console.log(taskIds);
  const [playerStats] = useMatchesStatistics(playerId, matchList);

  const cardClassName = cn(
    'd-flex flex-column justify-content-center p-2 w-100',
    'align-items-center align-items-md-baseline align-items-lg-baseline align-items-xl-baseline',
  );

  return (
    <div className={cardClassName}>
      {place !== undefined && (
        <h6 title={i18next.t('Your place in tournament')} className="p-1">
          <TournamentPlace title={i18next.t('Your place')} place={place + 1} />
        </h6>
      )}
      <h6 title={i18next.t('Your score')} className="p-1">
        {`${i18next.t('Your score')}: ${playerStats.score}`}
      </h6>
      {/* <h6 */}
      {/*   title="Your task_ids" */}
      {/*   className="p-1" */}
      {/* > */}
      {/*   {`${i18next.t('taskIds')}: ${taskIds}`} */}
      {/* </h6> */}
      <h6 title={i18next.t('Your game played')} className="p-1">
        {`${i18next.t('Games')}: ${matchList.length}`}
      </h6>
      <h6
        title="Stats: Win games / Lost games / Canceled games"
        className="d-none d-md-block d-lg-block d-xl-block p-1"
      >
        {i18next.t('Stats: ')}
        <span className="text-success">
          {`${i18next.t('Win')} ${playerStats.winMatches.length}`}
        </span>
        {' / '}
        <span className="text-danger">
          {`${i18next.t('Lost')} ${playerStats.lostMatches.length}`}
        </span>
        {' / '}
        <span className="text-muted">
          {`${i18next.t('Timeout')} ${matchList.length - playerStats.winMatches.length - playerStats.lostMatches.length}`}
        </span>
      </h6>
      <h6
        title="Stats: Win games / Lost games / Canceled games"
        className="d-block d-md-none p-1"
      >
        {i18next.t('Stats: ')}
        <span className="text-success">{playerStats.winMatches.length}</span>
        {' / '}
        <span className="text-danger">{playerStats.lostMatches.length}</span>
        {' / '}
        <span className="text-muted">
          {matchList.length
            - playerStats.winMatches.length
            - playerStats.lostMatches.length}
        </span>
      </h6>
    </div>
  );
}

export default memo(StatisticsCard);
