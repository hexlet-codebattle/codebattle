import React from 'react';
import cn from 'classnames';
import { trClassName, truncate } from '../../utils/groupTournament';
import { type SlicePlayer } from './types';

interface LeaderboardSlicePlayerRowProps {
  player: SlicePlayer;
  index: number;
  currentUserId?: number;
}

const LeaderboardSlicePlayerRow = ({
  player,
  index,
  currentUserId,
}: LeaderboardSlicePlayerRowProps) => {
  const isMe = Number.isInteger(currentUserId) && player.userId === currentUserId;
  return (
    <tr
      className={cn(trClassName(player.place as number), { 'cb-current-user-row': isMe })}
      style={isMe ? { outline: '2px solid #ffc107' } : undefined}
    >
      <td className="p-1 align-middle">{player.place ?? index + 1}</td>
      <td className="p-1 align-middle" title={player.name}>
        {truncate(player.name) as React.ReactNode}
      </td>
      <td className="p-1 align-middle text-white" title={player.clan || ''}>
        {player.clan ? (truncate(player.clan) as React.ReactNode) : '—'}
      </td>
      <td className="p-1 align-middle text-right font-weight-bold">{player.score}</td>
    </tr>
  );
};

export default LeaderboardSlicePlayerRow;
