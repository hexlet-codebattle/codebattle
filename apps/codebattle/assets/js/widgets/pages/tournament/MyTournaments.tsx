import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Box, Button, Flex, Image, Table, Text } from '@mantine/core';
import { camelizeKeys } from 'humps';
import i18next from 'i18next';
import unionBy from 'lodash/unionBy';

import Loading from '../../components/Loading';

import { formatStartsAt } from './dateTime';

interface CreatedTournament {
  id: number;
  name?: string;
  type?: string;
  level?: string;
  state?: string;
  startsAt?: string;
}

interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}

type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface MyTournamentsProps {
  isActive?: boolean;
  userTimezone?: string;
}

function MyTournaments({ isActive = false, userTimezone = 'UTC' }: MyTournamentsProps) {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [tournaments, setTournaments] = useState<CreatedTournament[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    pageNumber: 1,
    pageSize: 20,
    totalEntries: 0,
    totalPages: 1,
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);
  const pageInfoRef = useRef(pageInfo);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    pageInfoRef.current = pageInfo;
  }, [pageInfo]);

  const fetchPage = useCallback(async (page: number, append = false) => {
    if (statusRef.current === 'loading') {
      return;
    }

    if (append && page > pageInfoRef.current.totalPages) {
      return;
    }

    setStatus('loading');

    try {
      const query = new URLSearchParams({
        page: String(page),
        page_size: String(pageInfoRef.current.pageSize),
      }).toString();
      const response = await fetch(`/api/v1/tournaments/created?${query}`);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = camelizeKeys(await response.json());

      setPageInfo(payload.pageInfo || pageInfoRef.current);
      setTournaments((prev) => {
        const incoming = payload.tournaments || [];
        return append ? unionBy(prev, incoming, 'id') : incoming;
      });
      setStatus('loaded');
    } catch (_error) {
      setStatus('error');
    }
  }, []);

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
    if (status === 'loading' || status === 'idle') {
      return <Loading />;
    }

    if (status === 'error') {
      return (
        <Text py="xl" ta="center" c="dimmed">
          {i18next.t('Failed to load tournaments')}
        </Text>
      );
    }

    return (
      <Text py="xl" ta="center" c="dimmed">
        {i18next.t("You haven't created any tournaments yet")}
      </Text>
    );
  }

  return (
    <Flex direction="column" h="100%">
      <Box ref={tableRef} className="mvh-100 cb-overflow-y-scroll" style={{ overflowX: 'auto' }}>
        <Table striped m={0}>
          <Table.Thead className="cb-text" style={{ position: 'sticky', top: 0 }}>
            <Table.Tr>
              <Table.Th p="md">{i18next.t('Name')}</Table.Th>
              <Table.Th p="md">{i18next.t('Type')}</Table.Th>
              <Table.Th p="md">{i18next.t('Level')}</Table.Th>
              <Table.Th p="md">{i18next.t('State')}</Table.Th>
              <Table.Th p="md">{i18next.t('Starts at')}</Table.Th>
              <Table.Th p="md">{i18next.t('Actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody className="cb-text">
            {tournaments.map((tournament) => (
              <Table.Tr key={tournament.id}>
                <Table.Td p="md" className="cb-border-color" style={{ verticalAlign: 'middle' }}>
                  {tournament.name}
                </Table.Td>
                <Table.Td
                  p="md"
                  className="cb-border-color"
                  style={{ verticalAlign: 'middle', wordBreak: 'break-word' }}
                >
                  {tournament.type}
                </Table.Td>
                <Table.Td
                  p="md"
                  className="cb-border-color"
                  style={{ verticalAlign: 'middle' }}
                  aria-label={`Level: ${tournament.level}`}
                >
                  <Box className="bg-gray cb-rounded" p={4} display="inline-block">
                    <Image
                      alt={tournament.level}
                      src={`/assets/images/levels/${tournament.level}.svg`}
                      w="auto"
                      h="auto"
                    />
                  </Box>
                </Table.Td>
                <Table.Td
                  p="md"
                  className="cb-border-color"
                  style={{ verticalAlign: 'middle', wordBreak: 'break-word' }}
                >
                  {tournament.state}
                </Table.Td>
                <Table.Td
                  p="md"
                  className="cb-border-color"
                  style={{
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatStartsAt(tournament.startsAt, userTimezone)}
                </Table.Td>
                <Table.Td
                  p="md"
                  className="cb-border-color"
                  style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}
                >
                  <Button
                    component="a"
                    href={`/tournaments/${tournament.id}`}
                    color="cbSuccess"
                    size="xs"
                    radius="md"
                    mr="xs"
                  >
                    {i18next.t('Show')}
                  </Button>
                  <Button
                    component="a"
                    href={`/tournaments/${tournament.id}/edit`}
                    variant="outline"
                    color="cbSecondary"
                    size="xs"
                    radius="md"
                  >
                    {i18next.t('Edit')}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
      <Box
        mt="auto"
        py="xs"
        px="md"
        fw={700}
        c="dimmed"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        {i18next.t('Total tournaments: %{count}', {
          count: pageInfo.totalEntries,
        })}
      </Box>
    </Flex>
  );
}

export default MyTournaments;
