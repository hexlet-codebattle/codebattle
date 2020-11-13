import React from 'react';
import _ from 'lodash';

const GoToNextGame = ({ currentUserId, info: { state, data: { matches } } }) => {
  if (state !== 'active') return;
  const activeMatches = matches.filter(match => match.state === 'active');
  const nextMatch = _.find(activeMatches, ({ players: [{ id: firstPlayerId }, { id: secondPlayerId }] }) => firstPlayerId === currentUserId || secondPlayerId === currentUserId);
  return (
    nextMatch
    && (
    <a className="btn btn-success btn-block" href={`/games/${nextMatch.game_id}`}>
      Go to next game
    </a>
    )
  );
};

export default GoToNextGame;
