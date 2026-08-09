import React, { memo, useMemo, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Anchor, Box, Button, Card, Flex, Table, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';

import UserInfo from '@/components/UserInfo';
import { toggleBanUser } from '@/middlewares/TournamentAdmin';
import { tournamentPlayersSelector } from '@/selectors';

import { type AppDispatch, type RootState } from '@/slices/store';

import { type Player } from '@/slices/initial';

import i18next from '../../../i18n';

interface Report {
  id: number;
  offenderId: number;
  reporterId: number;
  gameId: number;
  state: string;
  insertedAt: string;
  [key: string]: unknown;
}

interface CheatersPanelProps {
  canModerate?: boolean;
}

function CheatersPanel({ canModerate = false }: CheatersPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const players = useSelector(tournamentPlayersSelector) as Record<number, Player>;
  const reports = useSelector((state: RootState) => (state.reports.list || []) as Report[]);
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<number, boolean>>({});

  const cheaters = useMemo(
    () =>
      Object.values(players || {})
        .filter((player) => player?.state === 'banned')
        .sort((left, right) => left.name.localeCompare(right.name)),
    [players],
  );

  const reportsByOffenderId = useMemo(() => {
    const sortedReports = [...reports].sort(
      (left, right) => dayjs(right.insertedAt).valueOf() - dayjs(left.insertedAt).valueOf(),
    );

    return sortedReports.reduce<Record<number, Report[]>>((acc, report) => {
      if (!acc[report.offenderId]) {
        acc[report.offenderId] = [];
      }

      acc[report.offenderId].push(report);
      return acc;
    }, {});
  }, [reports]);

  if (!canModerate) {
    return null;
  }

  const handleToggleCheater = (userId: number, isBanned: boolean) => () => {
    dispatch(toggleBanUser(userId, isBanned));
  };

  const toggleReports = (playerId: number) => () => {
    setExpandedPlayerIds((current) => ({
      ...current,
      [playerId]: !current[playerId],
    }));
  };

  return (
    <Box my="xs" style={{ display: 'flex', flexDirection: 'column' }}>
      <Card withBorder radius="md" p={0} className="cb-bg-panel">
        <Card.Section withBorder p="md" className="cb-bg-panel">
          <Flex justify="space-between" align="center">
            <Text fw={700}>{i18next.t('Cheaters')}</Text>
            <Text size="xs" c="dimmed">
              {i18next.t('Total')}: {cheaters.length}
            </Text>
          </Flex>
        </Card.Section>
        <Card.Section p={0}>
          {cheaters.length === 0 ? (
            <Text p="md" c="dimmed">
              {i18next.t('No cheaters marked yet')}
            </Text>
          ) : (
            <Table striped className="cb-text-light cb-custom-event-table mb-0">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="border-0 cb-text-light">{i18next.t('Player')}</Table.Th>
                  <Table.Th className="border-0 cb-text-light">{i18next.t('Clan')}</Table.Th>
                  <Table.Th className="border-0 cb-text-light">{i18next.t('Games')}</Table.Th>
                  <Table.Th className="border-0 cb-text-light">{i18next.t('Reports')}</Table.Th>
                  <Table.Th className="border-0 cb-text-light">{i18next.t('Actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {cheaters.map((player) => {
                  const playerReports = reportsByOffenderId[player.id] || [];
                  const isExpanded = !!expandedPlayerIds[player.id];

                  return (
                    <React.Fragment key={`cheater-${player.id}`}>
                      <Table.Tr>
                        <Table.Td className="align-middle cb-text-light">
                          <UserInfo user={player} banned hideOnlineIndicator hideLink />
                        </Table.Td>
                        <Table.Td className="align-middle cb-text-light">
                          {(player.clan as string) || '-'}
                        </Table.Td>
                        <Table.Td className="align-middle cb-text-light">
                          {(player.matchesIds as unknown[])?.length ??
                            (player.matches_ids as unknown[])?.length ??
                            0}
                        </Table.Td>
                        <Table.Td className="align-middle cb-text-light">
                          {playerReports.length === 0 ? (
                            <Text component="span" c="dimmed">
                              {i18next.t('No reports yet')}
                            </Text>
                          ) : (
                            <Button
                              size="compact-xs"
                              variant="outline"
                              color="gray"
                              onClick={toggleReports(player.id)}
                              leftSection={
                                <FontAwesomeIcon
                                  icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                                />
                              }
                            >
                              {i18next.t('Reports')} ({playerReports.length})
                            </Button>
                          )}
                        </Table.Td>
                        <Table.Td className="align-middle">
                          <Button
                            size="compact-xs"
                            variant="outline"
                            color="green"
                            onClick={handleToggleCheater(player.id, true)}
                          >
                            {i18next.t('Unban')}
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && playerReports.length > 0 && (
                        <Table.Tr aria-label={i18next.t('Reports')}>
                          <Table.Td colSpan={5} className="border-top-0 pt-0">
                            <Box px="md" pb="md" pt="xs">
                              {playerReports.map((report) => {
                                const reporter = players[report.reporterId];

                                return (
                                  <Flex
                                    key={`cheater-${player.id}-report-${report.id}`}
                                    align="center"
                                    wrap="wrap"
                                    py="xs"
                                    className="cb-text-light"
                                  >
                                    <Box mr="md">
                                      <UserInfo user={reporter} hideOnlineIndicator hideLink />
                                    </Box>
                                    <Text mr="md" c="dimmed">
                                      {dayjs(report.insertedAt).format('YYYY-MM-DD HH:mm:ss')}
                                    </Text>
                                    <Text mr="md" tt="capitalize">
                                      {report.state}
                                    </Text>
                                    <Button
                                      component="a"
                                      href={`/games/${report.gameId}`}
                                      size="compact-xs"
                                      variant="outline"
                                      color="gray"
                                    >
                                      {i18next.t('Game')} #{report.gameId}
                                    </Button>
                                  </Flex>
                                );
                              })}
                            </Box>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Card.Section>
      </Card>
    </Box>
  );
}

export default memo(CheatersPanel);
