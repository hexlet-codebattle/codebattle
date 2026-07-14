import React from 'react';

import cn from 'classnames';
import capitalize from 'lodash/capitalize';

import { getRankingPoints, getTasksCount, grades, type Grade } from '@/config/grades';

const getGradeDescriptionClassName = (highlight: boolean) =>
  cn('d-flex flex-column flex-lg-row flex-md-row flex-sm-row justify-content-between', {
    'text-monospace': highlight,
  });

interface GradeInfoProps {
  grade: Grade | string;
  selected: Grade | string;
}

function GradeInfo({ grade, selected }: GradeInfoProps) {
  return (
    <div className={getGradeDescriptionClassName(grade === selected)}>
      <span className={grade === selected ? 'text-white' : ''}>
        {capitalize(grade)}
        {grade === selected && '(*)'}
      </span>
      <span className={cn('pl-3', { 'text-white': grade === selected })}>
        [{getRankingPoints(grade).join(', ')}]
      </span>
    </div>
  );
}

interface TournamentDescriptionProps {
  className?: string;
  tournament: {
    grade: Grade | string;
    description?: string;
  };
}

function TournamentDescription({ className, tournament }: TournamentDescriptionProps) {
  return (
    <div className={className}>
      {tournament.grade !== grades.open ? (
        <>
          <span className="text-white">Tournament Highlights:</span>
          <div className="d-flex flex-column">
            <span>Prizes: Codebattle T-shirt merch for a top-tier of League</span>
            <span>{`Challenges: ${getTasksCount(tournament.grade)} unique algorithm problems`}</span>
            <span>Impact: Advancing in the Codebattle programmer rankings</span>
          </div>
          <div className="d-flex justify-content-center w-100">
            <div className="card cb-card mt-2">
              <div className="card-header text-center">View League Ranking Points System</div>
              <div className="card-body">
                {[
                  grades.rookie,
                  grades.challenger,
                  grades.pro,
                  grades.elite,
                  grades.masters,
                  grades.grandSlam,
                ].map((grade) => (
                  <GradeInfo grade={grade} selected={tournament.grade} />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <span className="text-white">Tournament Description:</span>
          {tournament.description}
        </>
      )}
    </div>
  );
}

export default TournamentDescription;
