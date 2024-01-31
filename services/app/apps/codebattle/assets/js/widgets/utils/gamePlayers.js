const resultToIcon = {
  gave_up: {
    name: 'gaveUp',
    tooltipText: 'Player gave up',
  },
  won: {
    name: 'won',
    tooltipText: 'Player won',
  },
};

export default ({ id: gameId, players }) => {
  if (players.length === 1) {
    return {
      player1: {
        data: players[0],
      },
    };
  }

  const [player1, player2] = players;
  const player1Icon = (player1.result !== 'won' && player1.result !== 'gave_up') || player2.result === 'gave_up'
    ? null
    : {
      name: resultToIcon[player1.result].name,
      tooltip: {
        id: `tooltip-${gameId}-${player1.id}`,
        text: resultToIcon[player1.result].tooltipText,
      },
    };
  const player2Icon = (player2.result !== 'won' && player2.result !== 'gave_up') || player1.result === 'gave_up'
    ? null
    : {
      name: resultToIcon[player2.result].name,
      tooltip: {
        id: `tooltip-${gameId}-${player2.id}`,
        text: resultToIcon[player2.result].tooltipText,
      },
    };

  return {
    player1: {
      data: player1,
      icon: player1Icon,
    },
    player2: {
      data: player2,
      icon: player2Icon,
    },
  };
};
