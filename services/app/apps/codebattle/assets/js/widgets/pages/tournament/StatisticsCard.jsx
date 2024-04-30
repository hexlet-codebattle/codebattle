import React, {
 memo,
} from 'react';

import cn from 'classnames';

import useMatchesStatistics from '@/utils/useMatchesStatistics';

import TournamentPlace from './TournamentPlace';

function StatisticsCard({
 playerId, taskIds = [], matchList = [], place,
}) {
  const [playerStats] = useMatchesStatistics(playerId, matchList);

  const cardClassName = cn(
    'd-flex flex-column justify-content-center p-2 w-100',
    'align-items-center align-items-md-baseline align-items-lg-baseline align-items-xl-baseline',
  );

  return (
    <div className={cardClassName}>
      {place !== undefined && (
        <h6
          title="Your place in tournament"
          className="p-1"
        >
          <TournamentPlace title="Your place" place={place + 1} />
        </h6>
      )}
      <h6
        title="Your score"
        className="p-1"
      >
        {`Your score: ${playerStats.score}`}
      </h6>
      <h6
        title="Your game played"
        className="p-1"
      >
        {`Games: ${matchList.length}`}
      </h6>
      <h6
        title="Your task_ids"
        className="p-1"
      >
        {`taskIds: ${taskIds}`}
      </h6>
      <h6
        title="Your game played"
        className="p-1"
      >
        {`Games: ${matchList.length}`}
      </h6>
      <h6
        title="Stats: Win games / Lost games / Canceled games"
        className="d-none d-md-block d-lg-block d-xl-block p-1"
      >
        {'Stats: '}
        <span className="text-success">
          {`Win ${playerStats.winMatches.length}`}
        </span>
        {' / '}
        <span className="text-danger">
          {`Lost ${playerStats.lostMatches.length}`}
        </span>
        {' / '}
        <span className="text-muted">
          {`Timeout ${matchList.length - playerStats.winMatches.length - playerStats.lostMatches.length}`}
        </span>
      </h6>
      <h6
        title="Stats: Win games / Lost games / Canceled games"
        className="d-block d-md-none p-1"
      >
        {'Stats: '}
        <span className="text-success">
          {playerStats.winMatches.length}
        </span>
        {' / '}
        <span className="text-danger">
          {playerStats.lostMatches.length}
        </span>
        {' / '}
        <span className="text-muted">
          {matchList.length - playerStats.winMatches.length - playerStats.lostMatches.length}
        </span>
      </h6>
    </div>
  );
}

export default memo(StatisticsCard);
