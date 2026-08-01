import React from 'react';

import { getRankingPoints, grades } from '@/config/grades';

import i18n from '../../i18n';
import dayjs from '../../i18n/dayjs';

import TournamentTimer from './TournamentTimer';

interface TournamentPreviewPanelProps {
  className?: string;
  tournament: { grade: string };
  start: string | number | Date;
  end: string | number | Date;
}

function TournamentPreviewPanel({
  className,
  tournament,
  start,
  end,
}: TournamentPreviewPanelProps) {
  const isRussian = dayjs.locale() === 'ru';
  const startDate = dayjs(start).format(isRussian ? 'D MMMM YYYY' : 'MMMM DD, YYYY');
  const startTime = dayjs(start).format(isRussian ? 'HH:mm' : 'hh:mm A');
  const endTime = dayjs(end).format(isRussian ? 'HH:mm' : 'hh:mm A');

  return (
    <div className={className}>
      <div className="d-flex flex-column border cb-border-color cb-rounded p-3">
        <span>{i18n.t('Start Date: %{date}', { date: startDate })}</span>
        <span>{i18n.t('Time: %{start} - %{end}', { start: startTime, end: endTime })}</span>
        {tournament.grade !== grades.open && (
          <span>
            {i18n.t('First Place Points: %{points} Ranking Points', {
              points: getRankingPoints(tournament.grade)[0],
            })}
          </span>
        )}
        <span>
          <TournamentTimer date={start} label={i18n.t('Starts in:')} />
        </span>
      </div>
    </div>
  );
}

export default TournamentPreviewPanel;
