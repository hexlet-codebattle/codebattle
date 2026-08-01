import React, { memo, useMemo } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import i18n from '../../../i18n';
import { gamePlayersSelector, userGameHeadToHeadSelector } from '../../selectors';

interface HeadToHeadPlayer {
  id: number;
  wins: number;
}

interface UserHeadToHeadProps {
  userId: number;
}

function UserHeadToHead({ userId }: UserHeadToHeadProps) {
  const { winnerId, players: rawPlayers } = useSelector(userGameHeadToHeadSelector);
  const players = rawPlayers as HeadToHeadPlayer[];
  const gamePlayers = useSelector(gamePlayersSelector);
  const opponentId = useMemo(
    () => Object.values(gamePlayers || {}).find((player) => player.id !== userId)?.id ?? null,
    [gamePlayers, userId],
  );

  const showHeadToHead = useMemo(
    () => players.reduce((acc, player) => acc + Number(player.wins), 0) > 0,
    [players],
  );

  if (!showHeadToHead) {
    return null;
  }

  const wins = players.find((player) => player.id === userId)?.wins ?? 0;
  const headToHeadClassName = cn('d-flex flex-nowrap ml-2 text-center', {
    'cb-game-score-won': winnerId === userId,
    'cb-game-score-lost': winnerId !== null && winnerId !== userId,
    'cb-game-score-draw': winnerId === null,
  });
  const href = opponentId ? `/h2h/${userId}/${opponentId}` : null;
  const content = (
    <>
      <span className="d-none d-lg-flex d-md-flex">H2H:</span>
      {wins}
    </>
  );

  if (!href) {
    return <div className={headToHeadClassName}>{content}</div>;
  }

  return (
    <a
      href={href}
      className={cn(headToHeadClassName, 'text-decoration-none')}
      title={i18n.t('Open H2H')}
    >
      {content}
    </a>
  );
}

export default memo(UserHeadToHead);
