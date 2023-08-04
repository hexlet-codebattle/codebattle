import React from 'react';
import _ from 'lodash';

const GoToNextGame = ({ currentUserId, tournamentsInfo: { playerGames } }) => {
  const nextGame = _.find(playerGames, ({ id }) => id === currentUserId);

  return (
    <>
      {
        nextGame && (
          <a className="btn btn-success btn-block" href={`/games/${nextGame.gameId}`}>
            Go to next game
          </a>
        )
      }
    </>
  );
};

export default GoToNextGame;
