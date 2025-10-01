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

// const getTabLinkClassName = (...hash) => {
//   const url = new URL(window.location);
//   const isActive = hash.includes(url.hash || '#lobby');
//
//   return cn(
//     'nav-item nav-link text-uppercase text-center text-nowrap rounded-0 font-weight-bold p-3 border-0 w-100',
//     {
//       active: isActive,
//     },
//   );
// };
//
// const tabContentClassName = (...hash) => {
//   const url = new URL(window.location);
//
//   return cn({
//     'tab-pane': true,
//     fade: true,
//     active: hash.includes(url.hash || '#lobby'),
//     show: hash.includes(url.hash || '#lobby'),
//   });
// };
//
// const getTabLinkHandler = hash => () => {
//   window.location.hash = hash;
// };
//
// const navTabsClassName = cn(
//   'nav nav-tabs flex-nowrap cb-overflow-x-auto cb-overflow-y-hidden',
//   'rounded-top border-bottom',
// );

// const LobbyContainer = ({
//   activeGames,
//   liveTournaments,
//   completedTournaments,
//   currentUserId,
//   isGuest = true,
//   isOnline = false,
// }) => {
//   const handleClick = useCallback(e => {
//     const { currentTarget: { dataset } } = e;
//     getTabLinkHandler(dataset.hash)();
//   }, []);
//
//   useEffect(() => {
//     if (!window.location.hash) {
//       getTabLinkHandler(hashLinkNames.default)();
//       window.scrollTo({ top: 0 });
//     }
//   }, []);
//
//   return (
//     <div className="p-0 shadow-sm rounded-lg">
//       <nav>
//         <div
//           id="nav-tab"
//           className={navTabsClassName}
//           role="tablist"
//         >
//           <a
//             className={getTabLinkClassName(
//               hashLinkNames.lobby,
//               hashLinkNames.default,
//             )}
//             id="lobby-tab"
//             data-toggle="tab"
//             data-hash={hashLinkNames.lobby}
//             href="#lobby"
//             role="tab"
//             aria-controls="lobby"
//             aria-selected="true"
//             onClick={handleClick}
//           >
//             Lobby
//           </a>
//           <a
//             className={getTabLinkClassName(
//               hashLinkNames.tournaments,
//             )}
//             id="tournaments-tab"
//             data-toggle="tab"
//             data-hash={hashLinkNames.tournaments}
//             href="#tournaments"
//             role="tab"
//             aria-controls="tournaments"
//             aria-selected="false"
//             onClick={handleClick}
//           >
//             Tournaments
//           </a>
//           <a
//             className={getTabLinkClassName(
//               hashLinkNames.completedGames,
//             )}
//             id="completedGames-tab"
//             data-toggle="tab"
//             data-hash={hashLinkNames.completedGames}
//             href="#completedGames"
//             role="tab"
//             aria-controls="completedGames"
//             aria-selected="false"
//             onClick={handleClick}
//           >
//             History
//           </a>
//         </div>
//       </nav>
//       <div className="tab-content" id="nav-tabContent">
//         <div
//           className={tabContentClassName(
//             hashLinkNames.lobby,
//             hashLinkNames.default,
//           )}
//           id="lobby"
//           role="tabpanel"
//           aria-labelledby="lobby-tab"
//         >
//           <ActiveGames
//             games={activeGames}
//             currentUserId={currentUserId}
//             isGuest={isGuest}
//             isOnline={isOnline}
//           />
//         </div>
//         <div
//           className={tabContentClassName(hashLinkNames.tournaments)}
//           id="tournaments"
//           role="tabpanel"
//           aria-labelledby="tournaments-tab"
//         >
//           <LiveTournaments tournaments={liveTournaments} />
//           <CompletedTournaments tournaments={completedTournaments} />
//         </div>
//         <div
//           className={tabContentClassName(hashLinkNames.completedGames)}
//           id="completedGames"
//           role="tabpanel"
//           aria-labelledby="completedGames-tab"
//         >
//           <CompletedGames className="cb-lobby-widget-container" />
//         </div>
//       </div>
//     </div>
//   );
// };
