import { Anchor, Badge, Center, Group, Loader, Pagination, Table, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceChip } from '@/features/seasons/LeaderboardTable';
import { formatSeconds } from '@/features/tasks/shared';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';

import { pct } from '../panels/common';
import type { LeaderboardRow } from '../types';
import type { TournamentApi } from '../useTournament';

const PAGE_SIZE = 16;

/** Final results (tournament:get_results type "leaderboard"), with season points. */
export function Leaderboard({ api }: { api: TournamentApi }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (api.status !== 'joined') return;
    api
      .push<{ results: LeaderboardRow[] }>('tournament:get_results', { params: { type: 'leaderboard' } })
      .then(({ results }) => setRows(results))
      .catch(() => setFailed(true));
  }, [api, api.status]);

  if (failed) {
    return (
      <Text c="dimmed" ta="center" py="md">
        {t("Couldn't load the results.")}
      </Text>
    );
  }

  if (!rows) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  if (rows.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="md">
        {t('No results yet')}
      </Text>
    );
  }

  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
    <Table.ScrollContainer minWidth={700}>
      <Table verticalSpacing={5} horizontalSpacing="sm" fz="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={60}>{t('Place')}</Table.Th>
            <Table.Th>{t('Player')}</Table.Th>
            <Table.Th>{t('Clan')}</Table.Th>
            <Table.Th ta="right">{t('Score')}</Table.Th>
            <Table.Th ta="right">{t('Wins')}</Table.Th>
            <Table.Th ta="right">{t('Avg Result')}</Table.Th>
            <Table.Th ta="right">{t('Time')}</Table.Th>
            <Table.Th ta="right">{t('Points')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {shown.map((row) => (
            <Table.Tr
              key={row.user_id}
              style={row.user_id === me.id ? { background: 'color-mix(in srgb, var(--cb-success) 12%, transparent)' } : undefined}
            >
              <Table.Td>
                <PlaceChip place={row.place} />
              </Table.Td>
              <Table.Td maw={240}>
                <Group gap={6} wrap="nowrap">
                  <LangIcon lang={row.user_lang} />
                  <UserCard user={{ id: row.user_id, name: row.user_name }}>
                    <Text span size="sm" fw={600} c="bright" truncate>
                      {row.user_name}
                    </Text>
                  </UserCard>
                  {row.is_cheater && (
                    <Badge size="xs" color="red" variant="light">
                      {t('Banned')}
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td maw={160}>
                {row.clan_name && row.clan_id ? (
                  <Anchor href={`/clans/${row.clan_id}`} size="sm" c="dimmed" truncate>
                    {row.clan_name}
                  </Anchor>
                ) : (
                  <Text size="sm" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
              <Table.Td ta="right" ff="monospace" fw={700} c="bright">
                {row.score}
              </Table.Td>
              <Table.Td ta="right" ff="monospace">
                {row.wins_count}/{row.games_count}
              </Table.Td>
              <Table.Td ta="right" ff="monospace" c="dimmed">
                {pct(row.avg_result_percent)}
              </Table.Td>
              <Table.Td ta="right" ff="monospace" c="dimmed">
                {row.total_time != null ? formatSeconds(row.total_time) : '—'}
              </Table.Td>
              <Table.Td ta="right" ff="monospace" fw={700}>
                {row.points}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
    {pages > 1 && (
      <Group justify="space-between" px="md" py="xs" style={{ borderTop: '1px solid var(--cb-border)' }}>
        <Text size="xs" c="dimmed">
          {t('Total players: %{count}', { count: rows.length })}
        </Text>
        <Pagination size="xs" total={pages} value={page} onChange={setPage} siblings={1} />
      </Group>
    )}
    </>
  );
}
