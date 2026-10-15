import { useRef } from 'react';

import { useMainEvent } from '@/api/mainEvents';
import { useChannel } from '@/api/useChannel';
import { t } from '@/i18n';
import { redirectWhenVisible } from '@/shared/redirectWhenVisible';
import { useSharedProps } from '@/shared/useSharedProps';

import { isPlayer } from './format';
import { useLobbyStore } from './store';
import type { LobbyGame, LobbyJoinReply, LobbyTournament } from './types';

export const gameUrl = (gameId: number) => `/games/${gameId}`;

const enterGame = (gameId: number) => redirectWhenVisible(gameUrl(gameId), `⚔️ ${t('Opponent found!')}`);

/**
 * Keeps the lobby store in sync with the "lobby" channel (games, finished
 * tournaments) and "main" (season tournaments opening/canceled), and sends the
 * user into their game as soon as an opponent joins it.
 */
export function useLobbyChannel() {
  const { current_user: user } = useSharedProps();
  const { reset, upsertGame, removeGame, updatePlayer, activateTournament, removeTournament } = useLobbyStore.getState();
  const redirected = useRef(false);

  const enterOnce = (gameId: number) => {
    if (redirected.current) return;
    redirected.current = true;
    enterGame(gameId);
  };

  // Season tournaments opening or being canceled arrive on "main" (relayed by AppLayout).
  useMainEvent('tournament:activated', ({ id, state, starts_at }: { id: number; state: LobbyTournament['state']; starts_at: string }) =>
    activateTournament({ id, state, starts_at }),
  );
  useMainEvent('tournament:canceled', ({ id }: { id: number }) => removeTournament(id));

  return useChannel('lobby', {
    onJoin: (reply: LobbyJoinReply) => {
      // A game we were waiting in may have started while the socket was down.
      const waiting = new Set(
        useLobbyStore
          .getState()
          .games.filter((game) => game.state === 'waiting_opponent' && isPlayer(game, user.id))
          .map(({ id }) => id),
      );
      const started = reply.active_games.find((game) => game.state === 'playing' && waiting.has(game.id));

      reset(reply);
      if (started) enterOnce(started.id);
    },
    events: {
      'game:upsert': ({ game }: { game: Partial<LobbyGame> & { id: number } }) => {
        if (game.state === 'playing' && game.players?.some(({ id }) => id === user.id)) {
          enterOnce(game.id);
          return;
        }

        upsertGame(game);
      },
      'game:remove': ({ game_id }: { game_id: number }) => removeGame(game_id),
      'game:finished': ({ game_id }: { game_id: number }) => removeGame(game_id),
      'game:check_started': ({ game_id, user_id }: { game_id: number; user_id: number }) => {
        const previous = useLobbyStore
          .getState()
          .games.find(({ id }) => id === game_id)
          ?.players.find(({ id }) => id === user_id)?.check_result;

        // Keep the last counts so the progress bar doesn't jump to zero mid-check.
        updatePlayer(game_id, user_id, {
          check_result: { success_count: 0, asserts_count: 0, ...previous, status: 'started' },
        });
      },
      'game:check_completed': ({ game_id, user_id, check_result }) => updatePlayer(game_id, user_id, { check_result }),
      'game:editor_lang_changed': ({ game_id, user_id, editor_lang }) => updatePlayer(game_id, user_id, { editor_lang }),
      // Finished tournaments live in the schedule's history, not the lobby.
      'tournament:finished': ({ id }: { id: number }) => removeTournament(id),
    },
  });
}
