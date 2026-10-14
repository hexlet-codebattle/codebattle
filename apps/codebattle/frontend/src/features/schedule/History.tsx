import { Anchor, Card, Center, Chip, Group, Loader, Pagination, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconSearch, IconUsers } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { gradeLabel, parseUtc, tournamentTitle } from '@/features/lobby/format';
import type { TournamentGrade } from '@/features/lobby/types';
import { UserCard } from '@/features/users/UserCard';
import { getLocale } from '@/i18n';
import { usePage } from '@/shared/usePage';
import { UserAvatar } from '@/shared/UserAvatar';

import { fetchHistory, type HistoryTournament } from './api';

const GRADES: TournamentGrade[] = ['grand_slam', 'masters', 'elite', 'pro', 'challenger', 'rookie'];
const PAGE_SIZE = 25;

function duration(tournament: HistoryTournament) {
  if (!tournament.last_round_ended_at) return null;
  const minutes = Math.round(
    (parseUtc(tournament.last_round_ended_at).getTime() - parseUtc(tournament.starts_at).getTime()) / 60000,
  );
  if (minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
}

/** Finished league tournaments (latest 200), filterable by grade and name. */
export function History() {
  const { t } = useTranslation();
  const [grades, setGrades] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = usePage(JSON.stringify([grades, query]));

  const { data, isPending, isError } = useQuery({ queryKey: ['schedule-history'], queryFn: fetchHistory, staleTime: 60_000 });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.tournaments ?? []).filter(
      (tournament) =>
        (grades.length === 0 || grades.includes(tournament.grade)) &&
        (!needle ||
          tournamentTitle(tournament.name, tournament.grade).toLowerCase().includes(needle) ||
          tournament.winner?.name.toLowerCase().includes(needle)),
    );
  }, [data, grades, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tournament of data?.tournaments ?? []) map.set(tournament.grade, (map.get(tournament.grade) ?? 0) + 1);
    return map;
  }, [data]);

  const date = new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
  const time = new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <Card padding={0}>
      <Group justify="space-between" p="md" gap="sm">
        <Chip.Group multiple value={grades} onChange={setGrades}>
          <Group gap={6}>
            {GRADES.filter((grade) => counts.has(grade)).map((grade) => (
              <Chip key={grade} value={grade} size="xs" variant="outline">
                <Group gap={4} wrap="nowrap">
                  <GradeIcon grade={grade} size={12} />
                  {gradeLabel(grade)}
                  <Text span fz={10} c="dimmed" ff="monospace">
                    {counts.get(grade)}
                  </Text>
                </Group>
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <TextInput
          size="xs"
          w={220}
          leftSection={<IconSearch size={14} />}
          placeholder={t('Tournament or winner')}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          aria-label={t('Search')}
        />
      </Group>

      {isPending ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : isError ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("Couldn't load the schedule.")}
        </Text>
      ) : filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {data.tournaments.length === 0 ? t('No finished tournaments yet') : t('Nothing matches your filters')}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing={6} horizontalSpacing="md" fz="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('Tournament')}</Table.Th>
                <Table.Th>{t('Date')}</Table.Th>
                <Table.Th ta="right">{t('Duration')}</Table.Th>
                <Table.Th ta="right">{t('Players')}</Table.Th>
                <Table.Th>{t('Winner')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown.map((tournament) => {
                const start = parseUtc(tournament.starts_at);
                return (
                  <Table.Tr key={tournament.id}>
                    <Table.Td maw={320}>
                      <Group gap={10} wrap="nowrap">
                        <GradeIcon grade={tournament.grade} size={24} />
                        <Stack gap={0} miw={0}>
                          <Anchor href={`/tournaments/${tournament.id}`} c="bright" fw={600} size="sm" truncate>
                            {tournamentTitle(tournament.name, tournament.grade)}
                          </Anchor>
                          <Text size="xs" c="dimmed">
                            {gradeLabel(tournament.grade)}
                          </Text>
                        </Stack>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{date.format(start)}</Text>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {time.format(start)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right" ff="monospace" c="dimmed">
                      {duration(tournament) ?? '—'}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end" wrap="nowrap" c="dimmed">
                        <IconUsers size={14} />
                        <Text size="sm" ff="monospace">
                          {tournament.players_count ?? 0}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {tournament.winner ? (
                        <Group gap={8} wrap="nowrap">
                          <UserAvatar user={tournament.winner} size={24} />
                          <UserCard user={tournament.winner}>
                            <Text span size="sm" fw={600} c="bright" truncate>
                              {tournament.winner.name}
                            </Text>
                          </UserCard>
                        </Group>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {pages > 1 && (
        <Group justify="center" py="sm" style={{ borderTop: '1px solid var(--cb-border)' }}>
          <Pagination size="sm" total={pages} value={page} onChange={setPage} />
        </Group>
      )}
    </Card>
  );
}
