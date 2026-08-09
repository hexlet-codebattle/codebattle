import React, { memo, useEffect, useMemo, useState } from 'react';

import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Text,
  Title,
} from '@mantine/core';

import { getPageProp } from '@/inertia/pageProps';

import socket from '../../../socket';

const WIDGETS = [
  { key: 'leftEditor', label: 'Left editor', params: 'font_size=24&editor_theme=cb-stream' },
  { key: 'rightEditor', label: 'Right editor', params: 'font_size=24&editor_theme=cb-stream' },
  { key: 'timer', label: 'Timer', params: '' },
  { key: 'task', label: 'Task', params: 'font_size=22' },
  { key: 'examples', label: 'Examples', params: 'font_size=20' },
  { key: 'leftTests', label: 'Left tests', params: '' },
  { key: 'rightTests', label: 'Right tests', params: '' },
];

const MATCH_STATE_ORDER = ['playing', 'pending', 'game_over', 'timeout', 'canceled', 'finished'];

interface StreamPlayer {
  id: number;
  name: string;
  lang?: string;
  editor_lang?: string;
  [key: string]: unknown;
}

interface StreamMatch {
  id: number;
  state: string;
  player_ids?: number[];
  round_id?: number;
  round_position?: number;
  game_id?: number | null;
  [key: string]: unknown;
}

const matchSorter = (a: StreamMatch, b: StreamMatch) => {
  const ai = MATCH_STATE_ORDER.indexOf(a.state);
  const bi = MATCH_STATE_ORDER.indexOf(b.state);
  if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  return (a.id || 0) - (b.id || 0);
};

const stateColor = (state: string) => {
  switch (state) {
    case 'playing':
      return 'green';
    case 'pending':
      return 'gray';
    case 'timeout':
      return 'yellow';
    case 'canceled':
      return 'gray';
    default:
      return 'gray';
  }
};

interface StreamLinksPanelProps {
  tournamentId: number | string;
}

function StreamLinksPanel({ tournamentId }: StreamLinksPanelProps) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = `${origin}/tournaments/${tournamentId}/stream?fullscreen=true`;

  const copy = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <Card withBorder radius="md" mb="md" p={0}>
      <Card.Section withBorder p="xs" px="md">
        <Text fw={700}>OBS / stream URLs</Text>
      </Card.Section>
      <Card.Section p={0}>
        <Box component="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {WIDGETS.map((w) => {
            const url = `${base}&widget=${w.key}${w.params ? `&${w.params}` : ''}`;
            return (
              <Box
                component="li"
                key={w.key}
                p="xs"
                px="md"
                style={{
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box mr="xs" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Text fw={700} component="span" mr="xs">
                    {w.label}
                  </Text>
                  <Text c="dimmed" component="code" style={{ fontSize: '12px' }}>
                    {url}
                  </Text>
                </Box>
                <Group gap="xs" style={{ flexShrink: 0 }}>
                  <Button
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    variant="outline"
                    size="xs"
                  >
                    Open
                  </Button>
                  <Button variant="default" size="xs" onClick={() => copy(url)}>
                    Copy
                  </Button>
                </Group>
              </Box>
            );
          })}
        </Box>
      </Card.Section>
    </Card>
  );
}

interface MatchRowProps {
  match: StreamMatch;
  playersById: Record<number, StreamPlayer>;
  isActive: boolean;
  onSetActive: (gameId: number | null | undefined) => void;
  disabled: boolean;
}

function MatchRow({ match, playersById, isActive, onSetActive, disabled }: MatchRowProps) {
  const players: StreamPlayer[] = (match.player_ids || []).map(
    (id) =>
      playersById[id] || {
        id,
        name: `#${id}`,
      },
  );

  return (
    <Box
      component="li"
      p="xs"
      px="md"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isActive ? 'rgba(34,197,94,0.12)' : undefined,
        borderLeft: isActive ? '4px solid #22c55e' : '4px solid transparent',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Flex align="center" gap="xs">
          <Badge color={stateColor(match.state)} tt="uppercase" fw={700} c="dark">
            {match.state}
          </Badge>
          <Text
            component="span"
            style={{ fontFamily: 'Menlo, Monaco, Consolas, monospace', fontSize: 13 }}
          >
            round {match.round_id ?? match.round_position ?? '?'} · match #{match.id}
          </Text>
          {match.game_id ? (
            <Text component="span" c="dimmed" style={{ fontSize: 12 }}>
              game #{match.game_id}
            </Text>
          ) : null}
        </Flex>
        <Box mt={4} style={{ fontSize: 15 }}>
          {players.length ? (
            players.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? (
                  <Text component="span" c="dimmed" mx="xs">
                    vs
                  </Text>
                ) : null}
                <Text component="span" fw={700}>
                  {p.name}
                </Text>
                {p.lang || p.editor_lang ? (
                  <Text component="span" c="dimmed" ml={4} style={{ fontSize: 12 }}>
                    [{p.lang || p.editor_lang}]
                  </Text>
                ) : null}
              </span>
            ))
          ) : (
            <Text component="span" c="dimmed">
              no players
            </Text>
          )}
        </Box>
      </div>
      <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
        {match.game_id ? (
          <Button
            component="a"
            href={`/games/${match.game_id}`}
            target="_blank"
            rel="noreferrer"
            variant="default"
            size="xs"
          >
            Game
          </Button>
        ) : null}
        <Button
          size="xs"
          color="green"
          variant={isActive ? 'filled' : 'outline'}
          onClick={() => onSetActive(match.game_id)}
          disabled={disabled || !match.game_id}
          title={!match.game_id ? 'match has no game yet' : 'show on stream'}
        >
          {isActive ? '✓ Live' : 'Set Live'}
        </Button>
      </Flex>
    </Box>
  );
}

function TournamentStreamAdminPage() {
  const tournamentId = getPageProp<number>('tournament_id');
  const tournamentName = getPageProp('tournament_name', `Tournament #${tournamentId}`);

  const [matches, setMatches] = useState<Record<number, StreamMatch>>({});
  const [playersById, setPlayersById] = useState<Record<number, StreamPlayer>>({});
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [status, setStatus] = useState('connecting');
  const [filter, setFilter] = useState('playing');

  useEffect(() => {
    if (!tournamentId) return () => {};

    const ch = socket.channel(`tournament_admin:${tournamentId}`, {});
    setChannel(ch);

    const mergePlayers = (list: StreamPlayer[] = []) => {
      if (!list.length) return;
      setPlayersById((prev) => {
        const next = { ...prev };
        list.forEach((p) => {
          if (p && p.id != null) next[p.id] = { ...next[p.id], ...p };
        });
        return next;
      });
    };

    const upsertMatches = (list: StreamMatch[] = []) => {
      if (!list.length) return;
      setMatches((prev) => {
        const next = { ...prev };
        list.forEach((m) => {
          if (m && m.id != null) next[m.id] = { ...next[m.id], ...m };
        });
        return next;
      });
    };

    const refs: unknown[] = [];

    refs.push(
      ch.on('tournament:match:upserted', (payload: any) => {
        if (payload?.match) upsertMatches([payload.match]);
        if (payload?.players) mergePlayers(payload.players);
      }),
    );

    refs.push(
      ch.on('tournament:stream:active_game', (payload: any) => {
        if (payload && 'game_id' in payload) {
          setActiveGameId(payload.game_id || null);
        }
      }),
    );

    refs.push(
      ch.on('tournament:round_created', () => {
        setMatches({});
      }),
    );

    ch.join()
      .receive('ok', (resp: any) => {
        setStatus('connected');
        upsertMatches(resp?.matches || []);
        mergePlayers(resp?.players || []);
        if (resp?.active_game_id) setActiveGameId(resp.active_game_id);
      })
      .receive('error', (err: any) => {
        console.error('admin join error', err);
        setStatus('error');
      });

    return () => {
      refs.forEach((ref, i) => {
        const events = [
          'tournament:match:upserted',
          'tournament:stream:active_game',
          'tournament:round_created',
        ];
        ch.off(events[i], ref);
      });
      ch.leave();
    };
  }, [tournamentId]);

  const matchList = useMemo(() => {
    const arr = Object.values(matches);
    arr.sort(matchSorter);
    if (filter === 'all') return arr;
    if (filter === 'playing') return arr.filter((m) => m.state === 'playing');
    if (filter === 'live') {
      return arr.filter((m) => m.state === 'playing' || m.game_id === activeGameId);
    }
    return arr;
  }, [matches, filter, activeGameId]);

  const setActive = (gameId: number | null | undefined) => {
    if (!channel || !gameId) return;
    setActiveGameId(gameId);
    channel
      .push('tournament:stream:active_game', { game_id: gameId, gameId })
      .receive('error', (err: any) => console.error('set active error', err));
  };

  const clearActive = () => {
    if (!channel) return;
    setActiveGameId(null);
    channel
      .push('tournament:stream:active_game', { game_id: null, gameId: null })
      .receive('error', (err: any) => console.error('clear active error', err));
  };

  const playingCount = matchList.filter((m) => m.state === 'playing').length;

  return (
    <div>
      <Flex align="center" justify="space-between" mb="md">
        <div>
          <Title order={3} mb={0}>
            Stream Admin · {tournamentName}
          </Title>
          <Text size="xs" c="dimmed">
            Status: {status} · playing matches: {playingCount} · active game:{' '}
            {activeGameId ? `#${activeGameId}` : '—'}
          </Text>
        </div>
        <Group gap="xs">
          <Button
            component="a"
            variant="outline"
            size="xs"
            href={`/tournaments/${tournamentId}/stream?fullscreen=true`}
            target="_blank"
            rel="noreferrer"
          >
            Open full stream
          </Button>
          <Button variant="outline" color="red" size="xs" onClick={clearActive}>
            Clear active
          </Button>
        </Group>
      </Flex>

      <StreamLinksPanel tournamentId={tournamentId} />

      <Card withBorder radius="md" p={0}>
        <Card.Section
          withBorder
          p="xs"
          px="md"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text fw={700}>Matches</Text>
          <SegmentedControl
            size="xs"
            value={filter}
            onChange={setFilter}
            data={[
              { value: 'playing', label: 'Playing' },
              { value: 'live', label: 'Live + Active' },
              { value: 'all', label: 'All' },
            ]}
          />
        </Card.Section>
        {matchList.length === 0 ? (
          <Text py="xl" ta="center" c="dimmed">
            No matches to show.
          </Text>
        ) : (
          <Box component="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {matchList.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                playersById={playersById}
                isActive={!!m.game_id && m.game_id === activeGameId}
                onSetActive={setActive}
                disabled={status !== 'connected'}
              />
            ))}
          </Box>
        )}
      </Card>
    </div>
  );
}

export default memo(TournamentStreamAdminPage);
