import React from 'react';

function GoToNextGame({ currentUserId, tournamentsInfo: { playerGames } }) {
  const nextGame = playerGames.find(({ id }) => id === currentUserId);

  return (
    nextGame && (
      <a className="btn btn-success btn-block" href={`/games/${nextGame.gameId}`}>
        Go to next game
      </a>
    )
  );
}

export default GoToNextGame;
