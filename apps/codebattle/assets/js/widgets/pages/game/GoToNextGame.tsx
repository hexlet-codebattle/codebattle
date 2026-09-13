import React from 'react';

import { Button } from '@mantine/core';

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
        <Button
          component="a"
          href={`/games/${nextGame.gameId}`}
          color="cbSuccess"
          fullWidth
          radius="md"
        >
          Go to next game
        </Button>
      )}
    </>
  );
}

export default GoToNextGame;
