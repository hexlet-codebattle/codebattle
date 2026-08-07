import React, { memo, useEffect, useRef, useCallback } from 'react';

import { Box, Button, Flex, Table, Text } from '@mantine/core';
import cn from 'classnames';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';

import i18n from '../../../i18n';
import GameLevelBadge from '../../components/GameLevelBadge';
import Loading from '../../components/Loading';
import ResultIcon from '../../components/ResultIcon';
import HorizontalScrollControls from '../../components/SideScrollControls';
import { type UserNameUser } from '../../components/UserName';
import UserInfo from '../../components/UserInfo';
import fetchionStatuses from '../../config/fetchionStatuses';
import { completedGamesSelector } from '../../selectors';
import { type AppDispatch } from '../../slices';
import { fetchCompletedGames, loadNextPage } from '../../slices/completedGames';
import getGamePlayersData from '../../utils/gamePlayers';

import { type LobbyGame } from './GameActionButton';
import GameCard from './GameCard';

interface LobbyCompletedGame extends LobbyGame {
  finishesAt?: string;
}

interface CompletedGamePlayer {
  data: UserNameUser;
  icon?: {
    name: 'gaveUp' | 'won';
    tooltip: { id: string; text: string };
  } | null;
}

interface InfiniteScrollableGamesProps {
  className?: string;
  tableClassName?: string;
  games: LobbyCompletedGame[];
}

const InfiniteScrollableGames = memo(
  ({ className, tableClassName, games }: InfiniteScrollableGamesProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const observableTable = tableRef.current;

      const onTableScroll = () => {
        if (!tableRef.current) return;
        const height =
          tableRef.current.scrollHeight - (tableRef.current.parentElement?.offsetHeight ?? 0);
        const delta = height - tableRef.current.scrollTop;

        if (delta < 500) {
          dispatch(loadNextPage());
        }
      };

      observableTable?.addEventListener('scroll', onTableScroll);

      return () => {
        observableTable?.removeEventListener('scroll', onTableScroll);
      };
    }, [dispatch]);

    const onCardsScroll = useCallback(
      (cardList: HTMLElement) => {
        const width = cardList.scrollWidth - (cardList.parentElement?.offsetWidth ?? 0);
        const delta = width - cardList.scrollLeft;

        if (delta < 500) {
          dispatch(loadNextPage());
        }
      },
      [dispatch],
    );

    return (
      <>
        <Box
          ref={tableRef}
          className={cn('mvh-100 cb-overflow-y-scroll', className)}
          display={{ base: 'none', md: 'block' }}
          style={{ overflowX: 'auto' }}
          data-testid="scroll"
        >
          <Table
            className={tableClassName}
            striped
            stickyHeader
            mb={0}
            verticalSpacing="md"
            horizontalSpacing="md"
            styles={{ td: { verticalAlign: 'middle', whiteSpace: 'nowrap' } }}
          >
            <Table.Thead className="cb-text">
              <Table.Tr>
                <Table.Th>{i18n.t('Level')}</Table.Th>
                <Table.Th ta="center" colSpan={2}>
                  {i18n.t('Players')}
                </Table.Th>
                <Table.Th>{i18n.t('Date')}</Table.Th>
                <Table.Th>{i18n.t('Actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {games.map((game) => {
                const { player1, player2 } = getGamePlayersData(game) as unknown as {
                  player1: CompletedGamePlayer;
                  player2: CompletedGamePlayer;
                };

                return (
                  <Table.Tr key={game.id}>
                    <Table.Td>
                      <GameLevelBadge level={game.level} />
                    </Table.Td>
                    <Table.Td className="cb-username-td">
                      <Flex align="center" style={{ minWidth: 0 }}>
                        <Flex align="center" justify="center" mr="sm" style={{ width: '1rem' }}>
                          <ResultIcon icon={player1.icon} />
                        </Flex>
                        <UserInfo user={player1.data} truncate />
                      </Flex>
                    </Table.Td>
                    <Table.Td className="cb-username-td">
                      <Flex align="center" style={{ minWidth: 0 }}>
                        <Flex align="center" justify="center" mr="sm" style={{ width: '1rem' }}>
                          <ResultIcon icon={player2.icon} />
                        </Flex>
                        <UserInfo user={player2.data} truncate />
                      </Flex>
                    </Table.Td>
                    <Table.Td>
                      {moment.utc(game.finishesAt).local().format('YYYY.MM.DD HH:mm')}
                    </Table.Td>
                    <Table.Td>
                      <Button
                        component="a"
                        color="cbSecondary"
                        size="sm"
                        radius="md"
                        href={`/games/${game.id}`}
                      >
                        {i18n.t('Show')}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>
        <Box hiddenFrom="md" my="sm">
          <HorizontalScrollControls onScroll={onCardsScroll}>
            {games.map((game) => (
              <GameCard key={`card-${game.id}`} type="completed" game={game} />
            ))}
          </HorizontalScrollControls>
        </Box>
      </>
    );
  },
);

interface CompletedGamesProps {
  className?: string;
  tableClassName?: string;
}

function CompletedGames({ className, tableClassName = '' }: CompletedGamesProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { completedGames, totalGames, status } = useSelector(completedGamesSelector);

  useEffect(() => {
    dispatch(fetchCompletedGames());
  }, [dispatch]);

  if (completedGames.length === 0) {
    return status === fetchionStatuses.loading ? (
      <Loading />
    ) : (
      <Text py="xl" ta="center" c="dimmed">
        {i18n.t('No completed games')}
      </Text>
    );
  }

  return (
    <>
      <InfiniteScrollableGames
        className={className}
        tableClassName={tableClassName}
        games={completedGames as unknown as LobbyCompletedGame[]}
      />
      <Box
        mt="auto"
        py="sm"
        px="xl"
        fw={700}
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          borderBottomLeftRadius: 'var(--mantine-radius-md)',
          borderBottomRightRadius: 'var(--mantine-radius-md)',
        }}
      >
        {i18n.t('Total games: %{count}', { count: totalGames })}
      </Box>
    </>
  );
}

export default CompletedGames;
