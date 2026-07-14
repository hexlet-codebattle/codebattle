import React from 'react';

interface PlayerGame {
  id: number;
  gameId: number;
}

interface GoToNextGameProps {
  currentUserId: number;
  tournamentsInfo: { playerGames?: PlayerGame[] };
}

function GoToNextGame({ currentUserId, tournamentsInfo: { playerGames } }: GoToNextGameProps) {
  if (!playerGames) {
    return <></>;
  }

  const nextGame = playerGames.find(({ id }) => id === currentUserId);

  return (
    <>
      {nextGame && (
        <a className="btn btn-success cb-btn-success btn-block" href={`/games/${nextGame.gameId}`}>
          Go to next game
        </a>
      )}
    </>
  );
}

export default GoToNextGame;
