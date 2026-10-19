import { Accordion, Alert, Badge, Group, Pagination, Stack, Text, TextInput } from '@mantine/core';
import { IconBan, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LangIcon } from '@/shared/LangIcon';
import { usePage } from '@/shared/usePage';
import { useSharedProps } from '@/shared/useSharedProps';

import { useTournamentStore } from '../store';
import type { Match, Player, Tournament } from '../types';
import type { TournamentApi } from '../useTournament';

import { PanelMessage } from './common';
import { MatchCards } from './MatchCards';

const PAGE_SIZE = 16;
// Only moderators get the live match feed; everyone else re-polls the opened player.
const REFRESH_MS = 15_000;

/** Legacy fuzzy search: the query's letters appear in order in the name. */
const fuzzy = (name: string, query: string) => {
  let index = 0;
  const target = name.toLowerCase();
  for (const char of query.toLowerCase()) {
    index = target.indexOf(char, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
};

function PlayerMatches({ player, api, ladder, live }: { player: Player; api: TournamentApi; ladder: boolean; live: boolean }) {
  const allMatches = useTournamentStore((state) => state.matches);
  const matches = useMemo(() => Object.values(allMatches).filter((match) => match.player_ids.includes(player.id)), [allMatches, player.id]);

  // Load this player's matches (and opponents) when the row opens.
  useEffect(() => {
    const push = api.moderator ? api.adminPush : api.push;
    const load = () =>
      push<{ matches: Match[]; players: Player[] }>('tournament:matches:request', { player_id: player.id })
        .then(({ matches: loaded, players }) => {
          useTournamentStore.getState().upsertMatches(loaded);
          useTournamentStore.getState().upsertPlayers(players ?? []);
        })
        .catch(() => undefined);
    load();
    if (!live || api.moderator) return;
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [api, player.id, live]);

  return <MatchCards api={api} matches={matches} playerId={player.id} showScoreFormula={ladder} />;
}

interface PlayersMatchesPanelProps {
  tournament: Tournament;
  api: TournamentApi;
  /** A player opened from another panel (clan / task rankings): pinned first and expanded. */
  searchedUserId?: number | null;
}

/** Every player with their matches (legacy PlayersMatchesPanel, "ratingMode"). */
export function PlayersMatchesPanel({ tournament, api, searchedUserId = null }: PlayersMatchesPanelProps) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const players = useTournamentStore((state) => state.players);
  const searched = searchedUserId != null ? players[searchedUserId] : undefined;
  const [query, setQuery] = useState(searched?.name ?? '');
  const [page, setPage] = usePage(query);
  const [opened, setOpened] = useState<string | null>(searchedUserId != null ? String(searchedUserId) : null);
  const hideResults = !tournament.show_results && !api.moderator;

  // Current round matches, and the full roster when the channel sent only part of it (big tournaments).
  useEffect(() => {
    if (api.status !== 'joined') return;
    const push = api.moderator && api.adminStatus === 'joined' ? api.adminPush : api.push;
    push<{ matches: Match[] }>('tournament:matches:request_for_round')
      .then(({ matches }) => useTournamentStore.getState().upsertMatches(matches))
      .catch(() => undefined);
    if (Object.keys(useTournamentStore.getState().players).length < tournament.players_count) {
      push<{ players: Player[] }>('tournament:players:request_all')
        .then(({ players: all }) => useTournamentStore.getState().upsertPlayers(all))
        .catch(() => undefined);
    }
  }, [api, tournament.players_count]);

  const sorted = useMemo(() => {
    const list = Object.values(players)
      .filter((player) => !player.is_bot && (!query.trim() || fuzzy(player.name, query.trim())))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name));
    return list;
  }, [players, query]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const shown = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // The viewer's own row leads their page.
  const ordered = [...shown.filter((player) => player.id === me.id), ...shown.filter((player) => player.id !== me.id)];

  return (
    <Stack gap="sm">
      {hideResults && (
        <Alert color="yellow" p="xs">
          {t('Wait revealing results')}
        </Alert>
      )}
      <TextInput
        size="xs"
        leftSection={<IconSearch size={14} />}
        placeholder={t('Search by name...')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        aria-label={t('Search player')}
      />
      {ordered.length === 0 ? (
        <PanelMessage>{t('No players match your filters')}</PanelMessage>
      ) : (
        <Accordion value={opened} onChange={setOpened} variant="separated" radius="md" chevronPosition="left">
          {ordered.map((player) => (
            <Accordion.Item key={player.id} value={String(player.id)}>
              <Accordion.Control py={4}>
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <Group gap={8} wrap="nowrap" miw={0}>
                    <Text size="sm" ff="monospace" c="dimmed" w={34}>
                      #{player.place || '—'}
                    </Text>
                    <LangIcon lang={player.lang} />
                    <Text size="sm" fw={600} c="bright" truncate>
                      {player.name}
                    </Text>
                    {player.id === me.id && (
                      <Badge size="xs" variant="light" color="green">
                        {t('you')}
                      </Badge>
                    )}
                    {player.id === searchedUserId && (
                      <Badge size="xs" variant="light">
                        {t('Search')}
                      </Badge>
                    )}
                    {player.state === 'banned' && <IconBan size={14} color="var(--cb-danger)" />}
                  </Group>
                  {!hideResults && (
                    <Group gap="md" wrap="nowrap" fz="xs" c="dimmed">
                      <span>
                        {t('Score')}: <b>{player.score ?? 0}</b>
                      </span>
                      <span>
                        {t('Wins')}: <b>{player.wins_count ?? 0}</b>
                      </span>
                    </Group>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {opened === String(player.id) && <PlayerMatches player={player} api={api} ladder={tournament.type === 'ladder'} live={tournament.state === 'active'} />}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
      {pages > 1 && (
        <Group justify="center">
          <Pagination size="sm" total={pages} value={page} onChange={setPage} siblings={1} />
        </Group>
      )}
    </Stack>
  );
}
