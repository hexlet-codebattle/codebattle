import { Anchor, Badge, Button, Card, Center, Group, Loader, Pagination, Table, Text, Title } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { levelLabel, parseUtc } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { StateBadge } from '@/features/schedule/EventModal';
import { getLocale } from '@/i18n';

interface CreatedTournament {
  id: number;
  name: string;
  type: string;
  level: GameLevel | null;
  state: string;
  starts_at: string | null;
}

interface CreatedPage {
  tournaments: CreatedTournament[];
  page_info: { page_number: number; total_pages: number; total_entries: number };
}

const PAGE_SIZE = 10;

async function fetchCreated(page: number): Promise<CreatedPage> {
  const response = await fetch(`/api/v1/tournaments/created?page=${page}&page_size=${PAGE_SIZE}`);
  if (!response.ok) throw new Error(`created tournaments: ${response.status}`);
  return response.json();
}

/** Tournaments the user created (GET /api/v1/tournaments/created), with links to manage them. */
export function CreatedTournaments({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useQuery({
    queryKey: ['created-tournaments', page],
    queryFn: () => fetchCreated(page),
    placeholderData: keepPreviousData,
  });
  const format = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Card padding={0}>
      <Group justify="space-between" p="md">
        <div>
          <Title order={5}>{t('Created by you')}</Title>
          {data && (
            <Text size="xs" c="dimmed">
              {t('Total tournaments: %{count}', { count: data.page_info.total_entries })}
            </Text>
          )}
        </div>
      </Group>
      {isPending ? (
        <Center py="lg">
          <Loader size="sm" />
        </Center>
      ) : isError ? (
        <Text c="dimmed" ta="center" py="lg">
          {t('Failed to load tournaments')}
        </Text>
      ) : data.tournaments.length === 0 ? (
        <Center py="lg" style={{ flexDirection: 'column', gap: 8 }}>
          <Text c="dimmed">{t("You haven't created any tournaments yet")}</Text>
          <Button size="xs" variant="default" onClick={onCreate}>
            {t('Create tournament')}
          </Button>
        </Center>
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing={6} horizontalSpacing="md" fz="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('Name')}</Table.Th>
                <Table.Th>{t('Type')}</Table.Th>
                <Table.Th>{t('Level')}</Table.Th>
                <Table.Th>{t('State')}</Table.Th>
                <Table.Th>{t('Starts at')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.tournaments.map((tournament) => (
                <Table.Tr key={tournament.id}>
                  <Table.Td maw={280}>
                    <Anchor href={`/tournaments/${tournament.id}`} fw={600} c="bright" size="sm" truncate>
                      {tournament.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="default" size="sm" tt="none">
                      {tournament.type}
                    </Badge>
                  </Table.Td>
                  <Table.Td c="dimmed">{tournament.level ? levelLabel(tournament.level) : '—'}</Table.Td>
                  <Table.Td>
                    <StateBadge state={tournament.state} />
                  </Table.Td>
                  <Table.Td c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {tournament.starts_at ? format.format(parseUtc(tournament.starts_at)) : '—'}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Button
                      component="a"
                      href={`/tournaments/${tournament.id}/edit`}
                      size="compact-xs"
                      variant="subtle"
                      leftSection={<IconPencil size={12} />}
                    >
                      {t('Edit')}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {data && data.page_info.total_pages > 1 && (
        <Group justify="center" py="xs" style={{ borderTop: '1px solid var(--cb-border)' }}>
          <Pagination size="sm" total={data.page_info.total_pages} value={page} onChange={setPage} />
        </Group>
      )}
    </Card>
  );
}
