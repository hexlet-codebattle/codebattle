import { Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { IconCircleCheck, IconDoorExit, IconExternalLink, IconPlayerPlay, IconUserPlus } from '@tabler/icons-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { notifications } from '@mantine/notifications';

import { useSharedProps } from '@/shared/useSharedProps';

import { useTournamentStore } from '../store';
import type { Match, Tournament } from '../types';
import type { TournamentApi } from '../useTournament';

import classes from './Room.module.css';

/** The newest live game the user plays in this tournament. */
export function useMyLiveMatch(userId: number): Match | null {
  return useTournamentStore((state) => {
    let latest: Match | null = null;
    for (const match of Object.values(state.matches)) {
      if (match.state === 'playing' && match.player_ids.includes(userId) && (!latest || match.id > latest.id)) latest = match;
    }
    return latest;
  });
}

/**
 * Sends join / leave and spins until the result arrives. They never reply: the result
 * comes as tournament:player:joined / left, which flips the player's membership and ends
 * the spinner; with no answer in 5 s the server dropped it (e.g. the tournament is full
 * or its process isn't running), so say so instead of spinning forever.
 */
export function useMembershipAction(api: TournamentApi, joined: boolean) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const [wasJoined, setWasJoined] = useState(joined);
  if (wasJoined !== joined) {
    setWasJoined(joined);
    setBusy(false);
  }
  useEffect(() => {
    if (!busy) return undefined;
    const timer = window.setTimeout(() => {
      setBusy(false);
      notifications.show({ color: 'red', message: t("The tournament didn't respond. Try again in a moment.") });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [busy, t]);

  const act = (event: 'tournament:join' | 'tournament:leave') => {
    setBusy(true);
    api.cast(event);
  };

  return { busy, setBusy, act };
}

/** Whether the viewer can join right now: signed in, not in yet, and the tournament takes players. */
export function useCanJoin(tournament: Tournament, api: TournamentApi) {
  const { current_user: me } = useSharedProps();
  const joined = useTournamentStore((state) => Boolean(state.players[me.id]));
  const open = tournament.state === 'waiting_participants' || tournament.state === 'active';
  const full = tournament.players_limit > 0 && tournament.players_count >= tournament.players_limit;
  return !me.is_guest && !joined && open && !full && tournament.is_live && api.status === 'joined';
}

/**
 * Join / leave, and where the player stands right now (live game, waiting) — one row
 * of the room's control bar. Returns null when there's nothing to say or do.
 */
export function PlayerRow({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const player = useTournamentStore((state) => state.players[me.id]);
  const liveMatch = useMyLiveMatch(me.id);
  const joined = Boolean(player);
  const { busy, setBusy, act } = useMembershipAction(api, joined);

  // Event stages link here with ?auto_join=1: join once the channel is up, then drop the flag.
  const [autoJoin, setAutoJoin] = useState<'wait' | 'send' | 'done'>(() =>
    new URL(window.location.href).searchParams.get('auto_join') === '1' ? 'wait' : 'done',
  );
  const canAutoJoin =
    !me.is_guest &&
    !joined &&
    tournament.is_live &&
    (tournament.state === 'waiting_participants' || tournament.state === 'active') &&
    api.status === 'joined';
  if (autoJoin === 'wait' && canAutoJoin) {
    setAutoJoin('send');
    setBusy(true);
  }
  useEffect(() => {
    const url = new URL(window.location.href);
    // The dropped flag also keeps a re-run (a new api object) from joining twice.
    if (autoJoin !== 'send' || url.searchParams.get('auto_join') !== '1') return;
    url.searchParams.delete('auto_join');
    window.history.replaceState(window.history.state, '', url);
    api.cast('tournament:join');
  }, [autoJoin, api]);

  if (me.is_guest) {
    return (
      <Text size="sm" c="dimmed">
        {t('Sign in to join the tournament.')}{' '}
        <Anchor href={`/session/new?next=${encodeURIComponent(window.location.pathname)}`} size="sm">
          {t('Sign in')}
        </Anchor>
      </Text>
    );
  }

  const open = tournament.state === 'waiting_participants' || tournament.state === 'active';
  const full = tournament.players_limit > 0 && tournament.players_count >= tournament.players_limit;

  let status: ReactNode = null;
  let action: ReactNode = null;

  const running = tournament.state === 'active';
  const leaveButton = (
    <Button
      size={running ? 'xs' : 'md'}
      variant={running ? 'subtle' : 'default'}
      color={running ? 'gray' : undefined}
      leftSection={<IconDoorExit size={running ? 14 : 16} />}
      loading={busy}
      disabled={api.status !== 'joined'}
      onClick={() => {
        // Leaving a running tournament drops the player from its ranking.
        if (running && !window.confirm(t('Leave the tournament? You will be removed from the ranking and get no new matches.'))) return;
        act('tournament:leave');
      }}
    >
      {t('Leave')}
    </Button>
  );

  // The tournament process isn't running: join / leave would be dropped by the server.
  if (!tournament.is_live && open) {
    return (
      <Stack gap={4} align="flex-end" className={classes.playerAction}>
        <Button size="md" variant="default" disabled leftSection={player ? <IconDoorExit size={16} /> : <IconUserPlus size={18} />}>
          {player ? t('Leave') : t('Join')}
        </Button>
        <Text size="xs" c="dimmed" ta="right">
          {t("The tournament isn't running right now. Joining reopens when an organizer restarts it.")}
        </Text>
      </Stack>
    );
  }

  if (!player) {
    if (!open) return null;
    // Visitors kept missing that they have to press Join to take part: spell it out.
    status = (
      <Text size="xs" c={full ? 'dimmed' : undefined}>
        {tournament.state === 'active'
          ? t('The tournament is running, you can still jump in.')
          : full
            ? t('The tournament is full.')
            : t("You're not registered yet. Press Join to take part, we'll notify you when it starts.")}
      </Text>
    );
    action = (
      <Button
        size="md"
        variant="filled"
        color="green"
        className={full ? undefined : classes.joinGlow}
        leftSection={<IconUserPlus size={18} />}
        loading={busy}
        disabled={full || api.status !== 'joined'}
        onClick={() => act('tournament:join')}
      >
        {t('Join')}
      </Button>
    );
  } else if (tournament.type === 'ladder' && running && !liveMatch) {
    // Running ladder: the round clock carries the player's status (LadderNote).
  } else if (liveMatch) {
    status = (
      <Text size="sm" fw={600} c="green">
        {t('Your game is live')}
      </Text>
    );
    action = (
      <Button
        component="a"
        href={`/games/${liveMatch.game_id}`}
        size="md"
        variant="filled"
        color="green"
        rightSection={<IconExternalLink size={14} />}
      >
        {t('Open game')}
      </Button>
    );
  } else if (tournament.state === 'waiting_participants') {
    status = (
      <Group gap={6} wrap="nowrap">
        <IconCircleCheck size={16} color="var(--cb-success)" />
        <Text size="xs">{t("You're in. The game opens here when the tournament starts.")}</Text>
      </Group>
    );
    action = leaveButton;
  } else if (running) {
    status = (
      <Group gap={6} wrap="nowrap">
        <IconPlayerPlay size={16} />
        <Text size="xs">{tournament.break_state === 'on' ? t('Break: the next round starts soon.') : t('Waiting for your next match.')}</Text>
      </Group>
    );
  } else {
    status = (
      <Text size="sm" c="dimmed">
        {t('You played in this tournament.')}
      </Text>
    );
  }

  // Hero layout: the action on top, what it means underneath.
  // Mid-tournament the participant can still leave: a quiet link under the status.
  const leaveLink = player && running ? leaveButton : null;
  if (!action && !status && !leaveLink) return null;

  return (
    <Stack gap={4} align="flex-end" className={classes.playerAction}>
      {action}
      {status && <div style={{ textAlign: 'right' }}>{status}</div>}
      {leaveLink}
    </Stack>
  );
}
