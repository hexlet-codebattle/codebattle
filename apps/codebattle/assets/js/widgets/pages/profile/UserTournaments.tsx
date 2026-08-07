import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Box, Flex, Table, Text } from '@mantine/core';
import { camelizeKeys } from 'humps';
import unionBy from 'lodash/unionBy';
import moment from 'moment';

import i18n from '../../../i18n';
import Loading from '../../components/Loading';

const gradeColors: Record<string, string> = {
  grand_slam: '#e0bf7a',
  masters: '#c2c9d6',
  elite: '#c48a57',
  pro: '#a4aab3',
  challenger: '#8a919c',
  rookie: '#6f7782',
  open: '#8a919c',
};

const formatGrade = (grade: string) =>
  grade.replaceAll('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

const formatTime = (seconds: number | string) => {
  const total = Number(seconds || 0);

  if (total < 3600) {
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  const hh = String(Math.floor(total / 3600)).padStart(2, '0');
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const navigateToTournament = (tournamentId: number | string) => {
  window.location.assign(`/tournaments/${tournamentId}`);
};

interface TournamentRecord {
  gamesCount: number;
  place: number;
  points: number;
  score: number;
  totalTime: number | string;
  tournamentGrade?: string;
  tournamentId: number | string;
  tournamentStartedAt: string;
  userLang?: string;
  winsCount: number;
}

interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}

type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface UserTournamentsProps {
  isActive?: boolean;
}

function UserTournaments({ isActive = false }: UserTournamentsProps) {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    pageNumber: 1,
    pageSize: 20,
    totalEntries: 0,
    totalPages: 1,
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);
  const pageInfoRef = useRef(pageInfo);
  const userId = useMemo(() => window.location.pathname.split('/').pop(), []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    pageInfoRef.current = pageInfo;
  }, [pageInfo]);

  const fetchPage = useCallback(
    async (page: number, append = false) => {
      if (statusRef.current === 'loading') {
        return;
      }

      if (append && page > pageInfoRef.current.totalPages) {
        return;
      }

      setStatus('loading');

      try {
        const nextPageSize = pageInfoRef.current.pageSize;
        const query = new URLSearchParams({
          page: String(page),
          page_size: String(nextPageSize),
        }).toString();
        const response = await fetch(`/api/v1/user/${userId}/tournaments?${query}`);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = camelizeKeys(await response.json());

        setPageInfo(payload.pageInfo || pageInfoRef.current);
        setTournaments((prev) => {
          const incoming = payload.tournaments || [];
          return append ? unionBy(prev, incoming, 'tournamentId') : incoming;
        });
        setStatus('loaded');
      } catch (_error) {
        setStatus('error');
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!isActive || tournaments.length > 0 || status !== 'idle') {
      return;
    }

    fetchPage(1, false);
  }, [fetchPage, isActive, status, tournaments.length]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const observableTable = tableRef.current;

    if (!observableTable) {
      return undefined;
    }

    const onTableScroll = () => {
      if (statusRef.current === 'loading') {
        return;
      }

      const maxScroll = observableTable.scrollHeight - observableTable.clientHeight;

      if (maxScroll <= 0) {
        return;
      }

      const delta = maxScroll - observableTable.scrollTop;
      const currentPageInfo = pageInfoRef.current;

      if (delta < 500 && currentPageInfo.pageNumber < currentPageInfo.totalPages) {
        fetchPage(currentPageInfo.pageNumber + 1, true);
      }
    };

    observableTable.addEventListener('scroll', onTableScroll);

    return () => {
      observableTable.removeEventListener('scroll', onTableScroll);
    };
  }, [fetchPage, isActive]);

  if (tournaments.length === 0) {
    if (status === 'loading') {
      return <Loading />;
    }

    if (status === 'error') {
      return (
        <Text py="xl" ta="center" c="dimmed">
          {i18n.t('Failed to load tournaments')}
        </Text>
      );
    }

    return (
      <Text py="xl" ta="center" c="dimmed">
        {i18n.t('No tournaments played yet')}
      </Text>
    );
  }

  return (
    <Flex h="100%" direction="column">
      <Box ref={tableRef} className="mvh-100 cb-overflow-y-scroll" style={{ overflowX: 'auto' }}>
        <Table
          striped
          stickyHeader
          mb={0}
          verticalSpacing="md"
          horizontalSpacing="md"
          styles={{
            td: { whiteSpace: 'nowrap', verticalAlign: 'middle' },
            th: { whiteSpace: 'nowrap' },
          }}
        >
          <Table.Thead className="cb-text">
            <Table.Tr>
              <Table.Th>{i18n.t('Grade')}</Table.Th>
              <Table.Th>{i18n.t('Place')}</Table.Th>
              <Table.Th>{i18n.t('Points')}</Table.Th>
              <Table.Th>{i18n.t('Score')}</Table.Th>
              <Table.Th>{i18n.t('Games')}</Table.Th>
              <Table.Th>{i18n.t('Wins')}</Table.Th>
              <Table.Th>{i18n.t('Time')}</Table.Th>
              <Table.Th>{i18n.t('Lang')}</Table.Th>
              <Table.Th>{i18n.t('Date')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody className="cb-text">
            {tournaments.map((item) => (
              <Table.Tr
                key={item.tournamentId}
                role="link"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => navigateToTournament(item.tournamentId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateToTournament(item.tournamentId);
                  }
                }}
              >
                <Table.Td>
                  <span
                    className="cb-rounded"
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor:
                        (item.tournamentGrade && gradeColors[item.tournamentGrade]) || '#8a919c',
                      color: '#1f2530',
                      fontWeight: 700,
                    }}
                  >
                    {formatGrade(item.tournamentGrade || 'open')}
                  </span>
                </Table.Td>
                <Table.Td>{`#${item.place}`}</Table.Td>
                <Table.Td>{item.points}</Table.Td>
                <Table.Td>{item.score}</Table.Td>
                <Table.Td>{item.gamesCount}</Table.Td>
                <Table.Td>{item.winsCount}</Table.Td>
                <Table.Td>{formatTime(item.totalTime)}</Table.Td>
                <Table.Td>{item.userLang || '-'}</Table.Td>
                <Table.Td>
                  {moment.utc(item.tournamentStartedAt).local().format('YYYY.MM.DD HH:mm')}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
      <Box
        mt="auto"
        py="sm"
        px="md"
        fw={700}
        c="dimmed"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          borderBottomLeftRadius: 'var(--mantine-radius-md)',
          borderBottomRightRadius: 'var(--mantine-radius-md)',
        }}
      >
        {i18n.t('Total tournaments: %{count}', { count: pageInfo.totalEntries })}
      </Box>
    </Flex>
  );
}

export default UserTournaments;
