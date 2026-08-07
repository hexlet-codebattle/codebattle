import React from 'react';

import { Box, Table, Text } from '@mantine/core';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';

import i18n from '../../../i18n';
import GameLevelBadge from '../../components/GameLevelBadge';
import HorizontalScrollControls from '../../components/SideScrollControls';
import gameStateCodes from '../../config/gameStateCodes';
// import hashLinkNames from '../../config/hashLinkNames';
import levelRatio from '../../config/levelRatio';

// import CompletedGames from './CompletedGames';
// import CompletedTournaments from './CompletedTournaments';
import GameActionButton, { type LobbyGame } from './GameActionButton';
import GameCard from './GameCard';
import GameStateBadge from './GameStateBadge';
// import LiveTournaments from './LiveTournaments';
import Players, { type LobbyPlayer } from './Players';

const isActiveGame = (game: LobbyGame) =>
  [gameStateCodes.playing, gameStateCodes.waitingOpponent].includes(game.state);

interface ActiveGamesProps {
  games?: LobbyGame[];
  currentUserId: number;
  isGuest?: boolean;
  isOnline?: boolean;
}

function ActiveGames({ games, currentUserId, isGuest, isOnline }: ActiveGamesProps) {
  if (!games) {
    return null;
  }

  const filterGames = (game: LobbyGame) => {
    if (game.visibilityType === 'hidden') {
      return !!find(game.players, { id: currentUserId });
    }
    return true;
  };
  const filtetedGames = games.filter(filterGames);

  if (isEmpty(filtetedGames)) {
    return <Text ta="center">{i18n.t('There are no active games right now.')}</Text>;
  }

  const gamesSortByLevel = sortBy(filtetedGames, [
    (game) => levelRatio[game.level as keyof typeof levelRatio],
  ]);

  const {
    gamesWithCurrentUser = [],
    gamesWithActiveUsers = [],
    gamesWithBots = [],
  } = groupBy(gamesSortByLevel, (game) => {
    const isCurrentUserPlay = game.players.some(({ id }) => id === currentUserId);
    if (isCurrentUserPlay) {
      return 'gamesWithCurrentUser';
    }
    if (!game.isBot) {
      return 'gamesWithActiveUsers';
    }
    return 'gamesWithBots';
  });

  const sortedGames = [...gamesWithCurrentUser, ...gamesWithActiveUsers, ...gamesWithBots];

  return (
    <>
      <Box display={{ base: 'none', md: 'block' }} className="cb-rounded">
        <Table
          striped
          mb={0}
          verticalSpacing="md"
          horizontalSpacing="md"
          styles={{
            th: { textAlign: 'center', color: 'var(--mantine-color-white)' },
            td: { verticalAlign: 'middle' },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{i18n.t('Level')}</Table.Th>
              <Table.Th>{i18n.t('State')}</Table.Th>
              <Table.Th colSpan={2}>{i18n.t('Players')}</Table.Th>
              <Table.Th>{i18n.t('Actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedGames.map(
              (game) =>
                isActiveGame(game) && (
                  <Table.Tr key={game.id} className="game-item">
                    <Table.Td className="cb-level-badge">
                      <Box className="bg-gray cb-rounded" p="md">
                        <GameLevelBadge level={game.level} />
                      </Box>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Box className="bg-gray cb-rounded" p="md">
                        <GameStateBadge state={game.state} />
                      </Box>
                    </Table.Td>
                    <Players
                      gameId={game.id}
                      mode="dark"
                      players={game.players as unknown as LobbyPlayer[]}
                      isBot={game.isBot}
                    />
                    <Table.Td ta="center">
                      <GameActionButton
                        type="table"
                        game={game}
                        currentUserId={currentUserId}
                        isGuest={isGuest}
                        isOnline={isOnline}
                      />
                    </Table.Td>
                  </Table.Tr>
                ),
            )}
          </Table.Tbody>
        </Table>
      </Box>
      <Box hiddenFrom="md" m="sm">
        <HorizontalScrollControls>
          {sortedGames.map(
            (game) =>
              isActiveGame(game) && (
                <GameCard
                  key={`card-${game.id}`}
                  type="active"
                  game={game}
                  currentUserId={currentUserId}
                  isGuest={isGuest}
                  isOnline={isOnline}
                />
              ),
          )}
        </HorizontalScrollControls>
      </Box>
    </>
  );
}

export default ActiveGames;
