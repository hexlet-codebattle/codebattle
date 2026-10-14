import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useChannel } from '@/api/useChannel';
import { t } from '@/i18n';
import { useTournamentStore } from '@/features/tournament/store';
import { playGameSound, playTournamentSound } from '@/shared/sound';
import { useSharedProps } from '@/shared/useSharedProps';
import { parseServerDate } from '@/shared/date';

import { isGameOver, useGameStore } from './store';
import type { CheckResult, Game, GamePlayer, GameTournamentInfo, HeadToHead, TournamentPlayer, TournamentRankingEntry, WaitType } from './types';

const EDITOR_SYNC_MS = 250;
const CURSOR_MS = 120;

interface JoinReply {
  game?: Game;
  error?: string;
  tournament?: GameTournamentInfo;
  current_player?: TournamentPlayer | null;
  active_game_id?: number | null;
}

/** Keeps the round clock (shared with the tournament page) in step with the server. */
function syncClockOffset(info: Partial<GameTournamentInfo>) {
  if (info.server_time) {
    useTournamentStore.setState({ clockOffsetMs: parseServerDate(info.server_time).getTime() - Date.now() });
  }
}

const goToGame = (gameId: number) => window.location.replace(`/games/${gameId}`);

type Handler = (payload: never) => void;

// Success has no reply (the outcome is broadcast as rematch:*), so a push timeout means nothing.
const rematchFailed = (error: { reason?: string } | Error) => {
  if (error instanceof Error) return;
  const messages: Record<string, string> = {
    game_is_dead: t('This game is closed, a rematch is no longer possible. Start a new game from the lobby.'),
    already_in_a_game: t('One of the players is already in another game.'),
  };
  notifications.show({ color: 'red', message: messages[error?.reason ?? ''] ?? t('Could not start a rematch. Try again.') });
};

/** The host's extra handlers run after the built-in ones for the same event (never instead). */
function withExtra(extra: Record<string, Handler>, builtIn: Record<string, Handler>) {
  const merged: Record<string, Handler> = { ...builtIn };
  Object.entries(extra).forEach(([event, handler]) => {
    const own = builtIn[event];
    merged[event] = own
      ? (payload) => {
          own(payload);
          handler(payload);
        }
      : handler;
  });
  return merged as Record<string, (payload: unknown) => void>;
}

/**
 * Joins `game:<id>`: loads the game from the join reply, mirrors the opponent's editor,
 * check results, give-ups, timeouts, rematches and (tournament games) the round state.
 */
interface UseGameOptions {
  /** Watching inside another page (the broadcast arena): no sounds, never navigates away. */
  embedded?: boolean;
  /** More `game:<id>` events for the host (a second join of the topic would replace this one). */
  extraEvents?: Record<string, (payload: never) => void>;
}

export function useGame(gameId: number, { embedded = false, extraEvents = {} }: UseGameOptions = {}) {
  const { current_user: me } = useSharedProps();
  const store = useGameStore.getState;
  const sound = (effect: Parameters<typeof playGameSound>[0]) => {
    if (!embedded) playGameSound(effect);
  };
  const tournamentSound = (cue: Parameters<typeof playTournamentSound>[0]) => {
    if (!embedded) playTournamentSound(cue);
  };
  const navigate = (nextGameId: number) => {
    if (!embedded) goToGame(nextGameId);
  };

  const refreshRanking = useRef<() => void>(() => undefined);

  const { status, push, cast } = useChannel(`game:${gameId}`, {
    onJoin: (reply: JoinReply) => {
      // The server answers {error} for a game it can't find; hosts show a message.
      store().set({ joinError: reply.error ?? null });
      if (!reply.game) return;
      // A rejoin (reconnect) brings the server's copy of my code, which lags behind my typing.
      const mine = store().game?.id === reply.game.id ? store().editors[me.id] : undefined;
      store().load(reply.game);
      if (mine) store().setEditor(me.id, mine);
      if (reply.tournament) {
        store().setTournament(reply.tournament);
        syncClockOffset(reply.tournament);
        store().set({ currentPlayer: reply.current_player ?? null, activeGameId: reply.active_game_id ?? null });
      }
    },
    events: withExtra(extraEvents, {
      'editor:data': ({ user_id: userId, editor_text: text, lang_slug: lang }: { user_id: number; editor_text: string; lang_slug: string }) => {
        if (userId !== me.id) store().setEditor(userId, { text, lang });
      },
      'user:start_check': ({ user_id: userId }: { user_id: number }) => store().setChecking(userId, true),
      'user:check_complete': (payload: {
        user_id: number;
        solution_status: boolean;
        state: string;
        players: GamePlayer[];
        check_result: CheckResult;
        award: string | null;
        post_timeout?: boolean;
      }) => {
        const wasOver = isGameOver(store().game?.state);
        store().setPlayers(payload.players);
        store().setOutput(payload.user_id, { ...payload.check_result, post_timeout: Boolean(payload.post_timeout) });
        store().setChecking(payload.user_id, false);
        store().patchGame({ state: payload.state, award: payload.award });

        // Every all-green run gets the victory sound, not just the one that won the game.
        if (payload.user_id === me.id) sound(payload.check_result?.status === 'ok' ? 'win' : 'failure');
        if (payload.solution_status && !wasOver) refreshRanking.current();
        if (payload.solution_status) void loadHeadToHead();
      },
      'user:give_up': ({ players, state, msg }: { players: GamePlayer[]; state: string; msg: string }) => {
        store().setPlayers(players);
        store().patchGame({ state });
        store().setMessage(msg);
        sound('give_up');
        refreshRanking.current();
        void loadHeadToHead();
      },
      'game:timeout': ({ game_state: state }: { game_state?: string }) => {
        if (isGameOver(store().game?.state)) return;
        store().patchGame({ state: state ?? 'timeout' });
        sound('time_is_over');
      },
      'game:updated': ({ state }: { state: string }) => {
        // An opponent joined: reload into the battle with full props (task, langs, players).
        if (!embedded && store().game?.state === 'waiting_opponent' && state === 'playing') window.location.reload();
      },
      'game:unlocked': () => store().patchGame({ locked: false }),
      'game:head_to_head': ({ head_to_head: headToHead }: { head_to_head: HeadToHead | null }) =>
        store().patchGame({ head_to_head: headToHead }),
      'rematch:status_updated': ({ rematch_state: state, rematch_initiator_id: initiator }: { rematch_state: string; rematch_initiator_id: number | null }) =>
        store().patchGame({ rematch_state: state, rematch_initiator_id: initiator }),
      'rematch:accepted': ({ game_id: newGameId }: { game_id: number }) => navigate(newGameId),
      'user:banned': ({ user_id: userId }: { user_id: number }) => {
        const player = store().players[userId];
        if (player) store().setPlayers(Object.values({ ...store().players, [userId]: { ...player, is_banned: true } }));
      },
      'user:unbanned': ({ user_id: userId }: { user_id: number }) => {
        const player = store().players[userId];
        if (player) store().setPlayers(Object.values({ ...store().players, [userId]: { ...player, is_banned: false } }));
      },

      // Tournament games.
      'tournament:game:created': ({ game_id: nextGameId }: { game_id: number }) => {
        if (nextGameId !== gameId) navigate(nextGameId);
      },
      'tournament:game:wait': ({ type }: { type: WaitType }) => store().set({ waitType: type }),
      'tournament:round_created': ({ tournament }: { tournament: Partial<GameTournamentInfo> }) => {
        store().mergeTournament(tournament);
        syncClockOffset(tournament);
        tournamentSound('roundStarted');
      },
      'tournament:round_finished': ({ tournament }: { tournament: Partial<GameTournamentInfo> }) => {
        store().mergeTournament(tournament);
        syncClockOffset(tournament);
        tournamentSound('roundFinished');
        refreshRanking.current();
      },
      'tournament:finished': ({ tournament }: { tournament: Partial<GameTournamentInfo> }) => {
        store().mergeTournament(tournament);
        tournamentSound('finished');
        refreshRanking.current();
      },
    }),
  });

  const loadHeadToHead = useCallback(
    () =>
      push<{ head_to_head: HeadToHead | null }>('game:head_to_head')
        .then(({ head_to_head: headToHead }) => store().patchGame({ head_to_head: headToHead }))
        .catch(() => undefined),
    [push, store],
  );

  refreshRanking.current = () => {
    if (!store().tournament) return;
    push<{ ranking: { entries: TournamentRankingEntry[] }; current_player: TournamentPlayer | null }>('tournament:ranking')
      .then(({ ranking, current_player: currentPlayer }) => {
        store().mergeTournament({ ranking });
        store().set({ currentPlayer });
      })
      .catch(() => undefined);
  };

  // Standings move while this game runs (other games finish); refresh them now and then.
  const isTournament = useGameStore((state) => state.tournament != null);
  useEffect(() => {
    if (embedded || !isTournament || status !== 'joined') return undefined;
    const timer = window.setInterval(() => refreshRanking.current(), 30_000);
    return () => window.clearInterval(timer);
  }, [embedded, isTournament, status]);

  // My editor: local state at once, the channel at most every EDITOR_SYNC_MS.
  const pending = useRef<{ text: string; lang: string } | null>(null);
  const timer = useRef<number | null>(null);
  const flush = useCallback(() => {
    timer.current = null;
    if (!pending.current) return;
    cast('editor:data', { editor_text: pending.current.text, lang_slug: pending.current.lang });
    pending.current = null;
  }, [cast]);

  const changeText = useCallback(
    (text: string) => {
      const lang = store().editors[me.id]?.lang ?? 'js';
      store().setEditor(me.id, { text });
      pending.current = { text, lang };
      if (timer.current == null) timer.current = window.setTimeout(flush, EDITOR_SYNC_MS);
    },
    [flush, me.id, store],
  );

  /** Switches my language: the template replaces the code unless I already wrote some in it. */
  const changeLang = useCallback(
    (lang: string, text: string) => {
      store().setEditor(me.id, { lang, text });
      pending.current = null;
      cast('editor:lang', { lang_slug: lang });
      cast('editor:data', { editor_text: text, lang_slug: lang });
    },
    [cast, me.id, store],
  );

  const check = useCallback(() => {
    const editor = store().editors[me.id];
    if (!editor || store().checking[me.id]) return;
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      flush();
    }
    store().setChecking(me.id, true);
    sound('check');
    // Success has no reply (the result comes as user:check_complete), so a push timeout means nothing.
    push('check_result', { editor_text: editor.text, lang_slug: editor.lang }).catch((error: { reason?: string } | Error) => {
      if (error instanceof Error) return;
      // After a timeout the game lives on briefly; once it is gone checks are refused.
      if (error?.reason === 'game_is_dead' || error?.reason === 'game_timeout') store().setOutput(me.id, { status: 'game_is_dead' });
      store().setChecking(me.id, false);
    });
  }, [flush, me.id, push, store]);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  /** One telemetry window for bot detection (Game.EditorEventBatch). */
  const sendEditorSummary = useCallback(
    (summary: Record<string, unknown>, lang: string) => cast('editor:summary', { summary, lang_slug: lang }),
    [cast],
  );

  // My cursor / selection / scroll for the room, at most every CURSOR_MS (the latest wins).
  const cursorPending = useRef<{ event: string; payload: Record<string, unknown> } | null>(null);
  const cursorTimer = useRef<number | null>(null);
  const shareCursor = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      cursorPending.current = { event, payload };
      if (cursorTimer.current != null) return;
      cursorTimer.current = window.setTimeout(() => {
        cursorTimer.current = null;
        if (cursorPending.current) cast(cursorPending.current.event, cursorPending.current.payload);
        cursorPending.current = null;
      }, CURSOR_MS);
    },
    [cast],
  );
  const cursorReport = useMemo(
    () => ({
      cursor: (offset: number) => shareCursor('editor:cursor_position', { offset }),
      selection: (start: number, end: number) => shareCursor('editor:cursor_selection', { start_offset: start, end_offset: end }),
      scroll: (top: number, left: number) => shareCursor('editor:scroll_position', { scroll_top: top, scroll_left: left }),
    }),
    [shareCursor],
  );

  return useMemo(
    () => ({
      status,
      changeText,
      changeLang,
      check,
      sendEditorSummary,
      cursorReport,
      giveUp: () => cast('give_up'),
      sendRematch: () => push('rematch:send_offer').catch(rematchFailed),
      acceptRematch: () => push('rematch:accept_offer').catch(rematchFailed),
      rejectRematch: () => push('rematch:reject_offer').catch(rematchFailed),
      /** Resolves true when the pass code unlocks the game. */
      enterPassCode: (passCode: string) =>
        push<{ result: boolean }>('enter_pass_code', { pass_code: passCode })
          .then(() => {
            store().patchGame({ locked: false });
            return true;
          })
          .catch(() => false),
    }),
    [status, changeText, changeLang, check, cast, push, sendEditorSummary, cursorReport],
  );
}

export type GameApi = ReturnType<typeof useGame>;
