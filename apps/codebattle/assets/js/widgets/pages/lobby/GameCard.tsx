import React, { useState } from 'react';

import { Box, Button, Flex, Text } from '@mantine/core';

import GameLevelBadge from '../../components/GameLevelBadge';
import ResultIcon from '../../components/ResultIcon';
import UserInfo from '../../components/UserInfo';
import { loadSimpleUserStats } from '../../middlewares/Users';
import getGamePlayersData from '../../utils/gamePlayers';

import { type UserNameUser } from '../../components/UserName';

import GameActionButton, { type LobbyGame } from './GameActionButton';
import GameProgressBar, { type CheckResult } from './GameProgressBar';
import GameStateBadge from './GameStateBadge';

interface CardPlayerData extends UserNameUser {
  editorLang?: string;
  checkResult: CheckResult;
}

interface CardPlayer {
  data: CardPlayerData;
  icon?: {
    name: 'gaveUp' | 'won';
    tooltip: { id: string; text: string };
  } | null;
}

const getPerfomance = (won: number, lost: number): number | string => {
  if (lost === 0) {
    return won;
  }

  if (won === 0) {
    return -1 * lost;
  }

  const diff = won / lost;

  const [int, rest] = String(diff).split('.');

  if (!rest) {
    return int;
  }

  return `${int}.${rest.slice(0, 2)}`;
};

interface UserGamesStats {
  won: number;
  lost: number;
}

interface UserSimpleStatsProps {
  user: CardPlayerData;
}

function UserSimpleStats({ user }: UserSimpleStatsProps) {
  const [state, setState] = useState('closed');
  const [data, setData] = useState<UserGamesStats | undefined>();

  const load = () => {
    const onSuccess = (payload: { stats: { games: UserGamesStats } }) => {
      setData(payload.stats.games);
      setState('opened');
    };
    const onFailure = () => {
      setState('error');
    };

    setState('loading');
    loadSimpleUserStats(onSuccess, onFailure)({ id: Number(user.id) });
  };

  return (
    <>
      {state === 'loading' && (
        <Button size="sm" color="cbSecondary" radius="md" disabled>
          Loading...
        </Button>
      )}
      {state === 'closed' && (
        <Button
          size="sm"
          color="cbSuccess"
          radius="md"
          onClick={load}
          style={{ whiteSpace: 'nowrap' }}
        >
          Show stats
        </Button>
      )}
      {state === 'opened' && (
        <Text component="span" style={{ whiteSpace: 'nowrap' }}>
          {`Won/Lost: ${getPerfomance(data?.won ?? 0, data?.lost ?? 0)}`}
        </Text>
      )}
      {state === 'error' && (
        <Button size="sm" color="red" radius="md" onClick={load}>
          Reload
        </Button>
      )}
    </>
  );
}

interface GameCardProps {
  type: 'active' | 'completed';
  game: LobbyGame;
  currentUserId?: number | null;
  isGuest?: boolean;
  isOnline?: boolean;
}

function GameCard({
  type,
  game,
  currentUserId = null,
  isGuest = true,
  isOnline = false,
}: GameCardProps) {
  const { player1, player2 } = getGamePlayersData(game) as unknown as {
    player1: CardPlayer;
    player2: CardPlayer;
  };

  return (
    <Flex
      key={`card-${game.id}`}
      className="game-item cb-bg-panel cb-border-color cb-rounded"
      direction="column"
      p="sm"
      mx="sm"
      style={{
        boxShadow: 'var(--mantine-shadow-sm)',
        border: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Flex mb="sm" h="100%">
        <Flex
          direction="column"
          justify="space-around"
          className="bg-gray cb-rounded"
          mr="sm"
          p="sm"
        >
          <Box mb="sm">
            <GameLevelBadge level={game.level} />
          </Box>
          <GameStateBadge state={game.state} />
        </Flex>
        <Flex direction="column" style={{ alignSelf: 'center' }}>
          {game.players.length === 1 ? (
            <Flex direction="column" align="center">
              <UserInfo user={player1.data} lang={player1.data.editorLang} />
              {currentUserId !== player1.data.id && <UserSimpleStats user={player1.data} />}
            </Flex>
          ) : (
            <>
              <Flex direction="column" align="center" pos="relative">
                <Flex align="center">
                  <ResultIcon icon={player1.icon} />
                  <UserInfo user={player1.data} lang={player1.data.editorLang} />
                </Flex>
                {type === 'active' && <GameProgressBar player={player1.data} position="left" />}
              </Flex>
              <Text ta="center">VS</Text>
              <Flex direction="column" align="center" pos="relative">
                <Flex align="center">
                  <ResultIcon icon={player2.icon} />
                  <UserInfo user={player2.data} lang={player2.data.editorLang} />
                </Flex>
                {type === 'active' && <GameProgressBar player={player2.data} position="left" />}
              </Flex>
            </>
          )}
        </Flex>
      </Flex>
      {type === 'active' && (
        <GameActionButton
          type="card"
          game={game}
          currentUserId={currentUserId}
          isGuest={isGuest}
          isOnline={isOnline}
        />
      )}
      {type === 'completed' && (
        <Button component="a" color="cbSecondary" size="sm" radius="md" href={`/games/${game.id}`}>
          Show
        </Button>
      )}
    </Flex>
  );
}

export default GameCard;
