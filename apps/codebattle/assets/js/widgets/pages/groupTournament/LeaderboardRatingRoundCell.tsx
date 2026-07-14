import React from 'react';
import cn from 'classnames';
import { tdClassName } from '../../utils/groupTournament';
import { type RoundCell } from './types';

interface LeaderboardRatingRoundCellProps {
  cell?: RoundCell | null;
}

const LeaderboardRatingRoundCell = ({ cell }: LeaderboardRatingRoundCellProps) => {
  if (!cell) {
    return <td className={cn(tdClassName, 'text-center text-muted')}>—</td>;
  }

  const sliceLabel = Number.isInteger(cell.sliceIndex) ? `S${(cell.sliceIndex as number) + 1}` : '';
  const placeLabel = Number.isInteger(cell.place) ? `#${cell.place}` : '';
  const meta = [sliceLabel, placeLabel].filter(Boolean).join('·');

  return (
    <td className={cn(tdClassName, 'text-center')} title={meta.replaceAll('·', ' · ')}>
      <span className="font-weight-bold">{cell.score ?? 0}</span>
      {meta && <span className="small ml-1">{`(${meta})`}</span>}
    </td>
  );
};

export default LeaderboardRatingRoundCell;
