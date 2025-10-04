import React from 'react';

import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';

import GameLevelBadge from '../../components/GameLevelBadge';
import HorizontalScrollControls from '../../components/SideScrollControls';
import gameStateCodes from '../../config/gameStateCodes';
// import hashLinkNames from '../../config/hashLinkNames';
import levelRatio from '../../config/levelRatio';

// import CompletedGames from './CompletedGames';
// import CompletedTournaments from './CompletedTournaments';
import GameActionButton from './GameActionButton';
import GameCard from './GameCard';
import GameStateBadge from './GameStateBadge';
// import LiveTournaments from './LiveTournaments';
import Players from './Players';

const isActiveGame = game => [gameStateCodes.playing, gameStateCodes.waitingOpponent].includes(game.state);

const ActiveGames = ({
  games, currentUserId, isGuest, isOnline,
}) => {
  if (!games) {
    return null;
  }

  const filterGames = game => {
    if (game.visibilityType === 'hidden') {
      return !!find(game.players, { id: currentUserId });
    }
    return true;
  };
  const filtetedGames = games.filter(filterGames);

  if (isEmpty(filtetedGames)) {
    return <p className="text-center">There are no active games right now.</p>;
  }

  const gamesSortByLevel = sortBy(filtetedGames, [
    game => levelRatio[game.level],
  ]);

  const {
    gamesWithCurrentUser = [],
    gamesWithActiveUsers = [],
    gamesWithBots = [],
  } = groupBy(gamesSortByLevel, game => {
    const isCurrentUserPlay = game.players.some(
      ({ id }) => id === currentUserId,
    );
    if (isCurrentUserPlay) {
      return 'gamesWithCurrentUser';
    }
    if (!game.isBot) {
      return 'gamesWithActiveUsers';
    }
    return 'gamesWithBots';
  });

  const sortedGames = [
    ...gamesWithCurrentUser,
    ...gamesWithActiveUsers,
    ...gamesWithBots,
  ];

  return (
    <>
      <div className="d-none d-md-block table-responsive rounded-bottom cb-bg-panel cb-rounded">
        <table className="table table-striped mb-0">
          <thead className="text-center text-white">
            <tr>
              <th className="p-3 border-0">Level</th>
              <th className="p-3 border-0">State</th>
              <th className="p-3 border-0 text-center" colSpan={2}>
                Players
              </th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedGames.map(
              game => isActiveGame(game) && (
                <tr key={game.id} className="game-item">
                  <td className="cb-level-badge align-middle">
                    <div className="p-3 bg-gray cb-rounded">
                      <GameLevelBadge level={game.level} />
                    </div>
                  </td>
                  <td className="text-center align-middle">
                    <div className="p-3 bg-gray cb-rounded">
                      <GameStateBadge state={game.state} />
                    </div>
                  </td>
                  <Players
                    gameId={game.id}
                    mode="dark"
                    players={game.players}
                    isBot={game.isBot}
                  />
                  <td className="p-3 align-middle text-center">
                    <GameActionButton
                      type="table"
                      game={game}
                      currentUserId={currentUserId}
                      isGuest={isGuest}
                      isOnline={isOnline}
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <HorizontalScrollControls className="d-md-none m-2">
        {sortedGames.map(game => isActiveGame(game) && (
          <GameCard
            key={`card-${game.id}`}
            type="active"
            game={game}
            currentUserId={currentUserId}
            isGuest={isGuest}
            isOnline={isOnline}
          />
        ))}
      </HorizontalScrollControls>
    </>
  );
};

export default ActiveGames;
