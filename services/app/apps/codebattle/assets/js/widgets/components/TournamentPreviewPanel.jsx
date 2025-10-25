import React from 'react';

import { getRankingPoints, grades } from '@/config/grades';

import dayjs from '../../i18n/dayjs';

import TournamentTimer from './TournamentTimer';

const TournamentPreviewPanel = ({
  className,
  tournament,
  start,
  end,
}) => (
  <div className={className}>
    <div className="d-flex flex-column cb-bg-panel cb-rounded p-3">
      <span>{`Start Date: ${dayjs(start).format('MMMM DD, YYYY')}`}</span>
      <span>{`Time: ${dayjs(start).format('hh:mm A')} - ${dayjs(end).format('hh:mm A')}`}</span>
      {tournament.grade !== grades.open
        && <span>{`First Place Points: ${getRankingPoints(tournament.grade)[0]} Ranking Points`}</span>}
      <span><TournamentTimer date={start} label="Starts in: " /></span>
    </div>
  </div>
);

export default TournamentPreviewPanel;
