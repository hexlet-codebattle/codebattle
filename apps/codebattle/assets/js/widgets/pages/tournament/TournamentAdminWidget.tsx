import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { Box, Button, Flex, Paper, Table, Text, Title } from '@mantine/core';

import { getPageProp } from '@/inertia/pageProps';
import { type AppDispatch } from '@/slices/store';

import {
  connectToTournament,
  requestMatchesForRound,
  pushActiveMatchToStream,
} from '../../middlewares/TournamentAdmin';
import * as selectors from '../../selectors';

interface RankingEntry {
  id: number;
  place?: number;
  name?: string;
  clan?: string;
  score?: number;
  [key: string]: unknown;
}

interface Match {
  id: number;
  gameId: number;
  state: string;
  winnerId: number;
  playerIds: number[];
  startedAt: string;
  [key: string]: unknown;
}

// Define CSS for active game animation
const activeGameStyles = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
  }

  .active-game {
    position: relative;
    animation: pulse 1.5s infinite;
    border: 2px solid #ffc107 !important;
  }

  .active-game-indicator {
    display: inline-block;
    margin-left: 3px;
    animation: rotate 1.5s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

function TournamentAdminWidget() {
  // Add style element for animations
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = activeGameStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  const tournamentId = getPageProp<number>('tournament_id');
  const dispatch = useDispatch<AppDispatch>();

  const tournament = useSelector(selectors.tournamentSelector);
  const tournamentAdmin = useSelector(selectors.tournamentAdminSelector);
  const [playerMatches, setPlayerMatches] = useState<Record<number, Match[]>>({});

  // Render match buttons for a specific player
  const renderPlayerMatchButtons = (playerId: number) => {
    const allMatches = playerMatches[playerId] || [];

    if (allMatches.length === 0) {
      return (
        <Text span c="dimmed">
          No matches
        </Text>
      );
    }

    return (
      <Flex wrap="wrap" gap={4}>
        {allMatches.map((match) => {
          // Determine button color based on match state.
          let variant: 'outline' | 'filled' = 'outline';
          let color: string = 'cbSecondary';
          if (match.state === 'finished') {
            variant = 'filled';
            color = match.winnerId === playerId ? 'cbSuccess' : 'red';
          } else if (match.state === 'playing') {
            variant = 'filled';
            color = 'orange';
          } else if (match.state === 'timeout') {
            color = 'yellow';
          }

          // Check if this is the active game.
          const isActiveGame =
            tournamentAdmin.activeGameId && match.gameId === tournamentAdmin.activeGameId;
          const title = isActiveGame ? '⭐ ACTIVE GAME - ' : '';

          return (
            <Button
              key={match.id}
              size="compact-xs"
              variant={variant}
              color={color}
              mr={4}
              mb={4}
              className={isActiveGame ? 'active-game' : ''}
              onClick={() => dispatch(pushActiveMatchToStream(match.gameId))}
              title={`${title}Match ID: ${match.id}, State: ${match.state}, Started: ${new Date(match.startedAt).toLocaleTimeString()}`}
            >
              #{match.gameId}
              {isActiveGame ? <span className="active-game-indicator">🔄</span> : ''}
            </Button>
          );
        })}
      </Flex>
    );
  };

  useEffect(() => {
    dispatch(connectToTournament(tournamentId, true));
  }, [dispatch, tournamentId]);

  useEffect(() => {
    if (tournament?.currentRoundPosition) {
      dispatch(requestMatchesForRound());
    }
  }, [dispatch, tournament?.currentRoundPosition]);

  // Group matches by player ID when matches data changes
  useEffect(() => {
    if (tournament?.matches && Object.keys(tournament.matches).length > 0) {
      const matchesByPlayer: Record<number, Match[]> = {};

      (Object.values(tournament.matches) as unknown as Match[]).forEach((match) => {
        if (match.playerIds && match.playerIds.length > 0) {
          match.playerIds.forEach((playerId) => {
            if (!matchesByPlayer[playerId]) {
              matchesByPlayer[playerId] = [];
            }
            matchesByPlayer[playerId].push(match);
          });
        }
      });

      setPlayerMatches(matchesByPlayer);
    }
  }, [tournament?.matches]);

  const renderRankingTable = () => {
    if (!tournament?.ranking?.entries || tournament.ranking.entries.length === 0) {
      return (
        <Text ta="center" mt="md">
          No ranking data available
        </Text>
      );
    }

    const ranking = tournament.ranking as {
      entries: RankingEntry[];
      pageNumber: number;
      totalEntries: number;
      pageSize: number;
    };

    return (
      <Box style={{ overflowX: 'auto' }}>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">ID</Table.Th>
              <Table.Th scope="col">Active</Table.Th>
              <Table.Th scope="col">Place</Table.Th>
              <Table.Th scope="col">Name</Table.Th>
              <Table.Th scope="col">Clan</Table.Th>
              <Table.Th scope="col">Score</Table.Th>
              <Table.Th scope="col">Matches</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(tournament.ranking.entries as RankingEntry[]).map((rankingPlayer) => {
              const players = tournament.players as Record<number, Record<string, unknown>>;
              return (
                <Table.Tr key={rankingPlayer.id}>
                  <Table.Td>{rankingPlayer.id}</Table.Td>
                  <Table.Td>
                    {players[rankingPlayer.id]?.drawIndex ===
                    players[rankingPlayer.id]?.maxDrawIndex
                      ? 'Active'
                      : 'InActive'}
                  </Table.Td>
                  <Table.Td>{rankingPlayer.place}</Table.Td>
                  <Table.Td>{rankingPlayer.name}</Table.Td>
                  <Table.Td>{rankingPlayer.clan || '-'}</Table.Td>
                  <Table.Td>{rankingPlayer.score}</Table.Td>
                  <Table.Td>{renderPlayerMatchButtons(rankingPlayer.id)}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        <Text ta="center" c="dimmed" size="xs">
          Page {ranking.pageNumber} of {Math.ceil(ranking.totalEntries / ranking.pageSize)}• Total
          players: {ranking.totalEntries}
        </Text>
      </Box>
    );
  };

  return (
    <Box w="100%" px="md">
      <Title order={1} ta="center">
        Tournament Admin Widget
      </Title>
      <Title order={2} ta="center">
        Tournament Name:
        {tournament?.name as React.ReactNode}
      </Title>

      <Paper shadow="sm" mt="lg" withBorder>
        <Box bg="cbHighlight" p="md" style={{ borderBottom: '1px solid #4c4c5a' }}>
          <Title order={4} c="white" m={0}>
            Player Rankings & Matches
          </Title>
        </Box>
        <Box p="md">{renderRankingTable()}</Box>
      </Paper>
    </Box>
  );
}

export default TournamentAdminWidget;
