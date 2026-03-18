import React, { memo, useMemo } from "react";

import cn from "classnames";
import { useSelector } from "react-redux";

import { gamePlayersSelector, userGameHeadToHeadSelector } from "../../selectors";

function UserHeadToHead({ userId }) {
  const { winnerId, players } = useSelector(userGameHeadToHeadSelector);
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
  const headToHeadClassName = cn("d-flex flex-nowrap ml-2 text-center", {
    "cb-game-score-won": winnerId === userId,
    "cb-game-score-lost": winnerId !== null && winnerId !== userId,
    "cb-game-score-draw": winnerId === null,
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
    <a href={href} className={cn(headToHeadClassName, "text-decoration-none")} title="Open H2H">
      {content}
    </a>
  );
}

export default memo(UserHeadToHead);
