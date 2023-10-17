import React from 'react';

const GoToNextGame = ({ currentUserId, tournamentsInfo: { playerGames } }) => {
  if (!playerGames) {
    return (<></>);
  }

  const nextGame = playerGames.find(({ id }) => id === currentUserId);

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
