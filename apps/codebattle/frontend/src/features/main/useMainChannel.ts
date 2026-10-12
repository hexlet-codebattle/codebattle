import { useEffect } from 'react';

import { emitMainEvent, MAIN_RELAYED_EVENTS } from '@/api/mainEvents';
import { useChannel } from '@/api/useChannel';
import { type PresenceState, usePresenceStore } from '@/features/presence/store';

import { useDeployStore, useFollowStore, useMainChannelStore } from './store';

const gameUrl = (gameId: number) => `/games/${gameId}`;
const onGamePage = (gameId: number) => window.location.pathname.replace(/\/$/, '') === gameUrl(gameId);

/**
 * Joins "main" once per page (AppLayout): presence (the user counts as online;
 * guests only receive the list), follow mode, admin redirects and deploy
 * banners. Other pushes are relayed to page-level subscribers (mainEvents).
 */
export function useMainChannel(state: PresenceState) {
  const { syncState, syncDiff } = usePresenceStore.getState();
  // Read once: changes after the join go through user:follow / user:unfollow pushes.
  const initialFollow = useFollowStore.getState();

  const { push, cast } = useChannel('main', {
    params: {
      state,
      path: window.location.pathname,
      ...(initialFollow.followId && !initialFollow.paused ? { follow_id: initialFollow.followId } : {}),
    },
    events: {
      presence_state: syncState,
      presence_diff: syncDiff,
      ...Object.fromEntries(MAIN_RELAYED_EVENTS.map((event) => [event, (payload: unknown) => emitMainEvent(event, payload)])),

      // A followed user started a game.
      'user:game_created': ({ active_game_id: gameId }: { active_game_id: number | null }) => {
        const { followId, paused } = useFollowStore.getState();
        if (followId && !paused && gameId && !onGamePage(gameId)) window.location.replace(gameUrl(gameId));
      },

      // Admin "send everyone/these users to …".
      'main:redirect': ({ url }: { url?: string }) => {
        if (typeof url === 'string' && url) window.location.href = url;
      },

      'deploy:handoff_started': () => useDeployStore.getState().setPhase('started'),
      'deploy:handoff_failed': () => useDeployStore.getState().setPhase('failed'),
      'deploy:handoff_done': () => {
        useDeployStore.getState().setPhase('done');
        // Same as legacy: let the new node settle, then pick up its state.
        window.setTimeout(() => window.location.reload(), 1200);
      },
    },
  });

  useEffect(() => {
    useMainChannelStore.setState({ push, cast });
  }, [push, cast]);
}

/** Start following `user`; jumps into their current game if they're in one. */
export async function followUser(user: { id: number; name: string }) {
  const { push } = useMainChannelStore.getState();
  const reply = await push<{ active_game_id: number | null }>('user:follow', { user_id: user.id });
  useFollowStore.getState().setFollow(user);

  const gameId = reply?.active_game_id;
  if (gameId && !onGamePage(gameId)) window.setTimeout(() => window.location.replace(gameUrl(gameId)), 1000);
}

export function unfollowUser() {
  const { followId, setFollow } = useFollowStore.getState();
  if (followId) useMainChannelStore.getState().cast('user:unfollow', { user_id: followId });
  setFollow(null);
}

/** Pause keeps the target but stops redirects (server unsubscribes); resume re-follows. */
export function setFollowPaused(paused: boolean) {
  const { followId, followName, setPaused } = useFollowStore.getState();
  if (!followId) return;

  if (paused) {
    useMainChannelStore.getState().cast('user:unfollow', { user_id: followId });
    setPaused(true);
  } else {
    void followUser({ id: followId, name: followName ?? '' });
  }
}
