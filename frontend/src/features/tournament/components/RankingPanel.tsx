import { ActionIcon, Button, Center, Group, Loader, Pagination, Table, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCurrentLocation, IconUserMinus } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceChip } from '@/features/seasons/LeaderboardTable';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';

import { useTournamentStore } from '../store';
import type { Ranking } from '../types';
import type { TournamentApi } from '../useTournament';

const PAGE_SIZE = 20;

/** Live standings, paged on the server (tournament:ranking:request); moderators can kick. */
export function RankingPanel({ api }: { api: TournamentApi }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const version = useTournamentStore((state) => state.rankingVersion);
  const players = useTournamentStore((state) => state.players);
  const isPlayer = useTournamentStore((state) => Boolean(state.players[me.id]));
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    (payload: Record<string, unknown>) =>
      api
        .push<{ ranking: Ranking }>('tournament:ranking:request', { page_size: PAGE_SIZE, ...payload })
        .then(({ ranking: next }) => {
          setRanking(next);
          setPage(next.page_number);
          setFailed(false);
        })
        .catch(() => setFailed(true)),
    [api],
  );

  // Refetch the page on every standings change (joins, rounds, ladder ticks).
  useEffect(() => {
    if (api.status === 'joined') void load({ page });
    // `page` changes come from user clicks, handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.status, version, load]);

  const kick = async (userId: number, name: string) => {
    if (!window.confirm(t('Kick %{name} from the tournament?', { name }))) return;
    try {
      await api.adminPush('tournament:player:kick', { user_id: userId });
      void load({ page });
    } catch {
      notifications.show({ color: 'red', message: t('Something went wrong') });
    }
  };

  if (failed && !ranking) {
    return (
      <Text c="dimmed" ta="center" py="md">
        {t("Couldn't load the ranking.")}
      </Text>
    );
  }

  if (!ranking) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  const pages = Math.max(1, Math.ceil(ranking.total_entries / ranking.page_size));

  return (
    <>
      {ranking.entries.length === 0 ? (
        <Text c="dimmed" ta="center" py="md">
          {t('No players yet.')}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing={5} horizontalSpacing="sm" fz="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={60}>{t('Place')}</Table.Th>
                <Table.Th>{t('Player')}</Table.Th>
                <Table.Th>{t('Clan')}</Table.Th>
                <Table.Th ta="right">{t('Wins')}</Table.Th>
                <Table.Th ta="right">{t('Score')}</Table.Th>
                {api.moderator && <Table.Th w={40} />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ranking.entries.map((entry) => (
                <Table.Tr key={entry.id} style={entry.id === me.id ? { background: 'color-mix(in srgb, var(--cb-success) 12%, transparent)' } : undefined}>
                  <Table.Td>
                    <PlaceChip place={entry.place} />
                  </Table.Td>
                  <Table.Td maw={220}>
                    <Group gap={6} wrap="nowrap">
                      <LangIcon lang={entry.lang} />
                      <UserCard user={{ id: entry.id, name: entry.name }}>
                        <Text span size="sm" fw={600} c="bright" truncate>
                          {entry.name}
                        </Text>
                      </UserCard>
                    </Group>
                  </Table.Td>
                  <Table.Td maw={160}>
                    <Text size="sm" c="dimmed" truncate>
                      {entry.clan ?? '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace" c="dimmed">
                    {players[entry.id]?.wins_count ?? '—'}
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace" fw={700} c="bright">
                    {entry.score}
                  </Table.Td>
                  {api.moderator && (
                    <Table.Td>
                      <Tooltip label={t('Kick')}>
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => kick(entry.id, entry.name)} aria-label={t('Kick')}>
                          <IconUserMinus size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {ranking.entries.length > 0 && (
        <Group justify="space-between" px="md" py="xs" style={{ borderTop: '1px solid var(--cb-border)' }}>
          <Text size="xs" c="dimmed">
            {t('%{count} players', { count: ranking.total_entries })}
          </Text>
          <Group gap="xs">
            {isPlayer && (
              <Button
                size="compact-xs"
                variant="default"
                leftSection={<IconCurrentLocation size={12} />}
                onClick={() => void load({ nearest: true, user_id: me.id })}
              >
                {t('Find me')}
              </Button>
            )}
            {pages > 1 && (
              <Pagination
                size="xs"
                total={pages}
                value={page}
                onChange={(next) => {
                  setPage(next);
                  void load({ page: next });
                }}
                siblings={0}
              />
            )}
          </Group>
        </Group>
      )}
    </>
  );
}
