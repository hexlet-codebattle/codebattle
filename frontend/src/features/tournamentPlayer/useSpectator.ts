import { useState } from 'react';

import { useChannel } from '@/api/useChannel';

/** `spectator:<player_id>` join reply (CodebattleWeb.SpectatorChannel). */
interface SpectatorJoinReply {
  active_game_id: number | null;
  type: string;
  tournament_id: number;
  state: string;
  break_state: string;
  current_round_position: number;
}

type TournamentPayload = { tournament?: { state?: string; break_state?: string; current_round_position?: number } };

export interface SpectatorState {
  /** The player's game to show: the active one on join, then each new one (`game:created`). */
  gameId: number | null;
  tournamentState: string | null;
  breakState: string | null;
  joined: boolean;
  failed: boolean;
}

/**
 * Follows one tournament player: `spectator:<player_id>` gives their active game on join and
 * pushes `game:created` when their next match starts; `tournament:<id>` keeps the
 * tournament's state (waiting / active / finished / canceled) current.
 */
export function useSpectator(playerId: number, tournamentId: number): SpectatorState {
  const [gameId, setGameId] = useState<number | null>(null);
  const [tournament, setTournament] = useState<{ state: string | null; breakState: string | null }>({ state: null, breakState: null });

  // A finished game stays on screen until the next one starts (the server sends no "cleared").
  const follow = (id: number | null | undefined) => {
    if (id) setGameId((current) => (current === id ? current : id));
  };

  const mergeTournament = (next: TournamentPayload['tournament']) => {
    if (!next) return;
    setTournament((current) => ({ state: next.state ?? current.state, breakState: next.break_state ?? current.breakState }));
  };

  const spectator = useChannel(`spectator:${playerId}`, {
    params: { tournament_id: tournamentId },
    onJoin: (reply: SpectatorJoinReply) => {
      follow(reply.active_game_id);
      mergeTournament(reply);
    },
    events: {
      'game:created': ({ active_game_id: id }: { active_game_id: number }) => follow(id),
    },
  });

  // Only the state transitions matter here; the payloads are the tournament's public fields.
  const onTournament = ({ tournament: next }: TournamentPayload) => mergeTournament(next);
  useChannel(`tournament:${tournamentId}`, {
    onJoin: ({ tournament: next }: TournamentPayload) => mergeTournament(next),
    events: {
      'tournament:round_created': onTournament,
      'tournament:round_finished': onTournament,
      'tournament:finished': onTournament,
      'tournament:restarted': onTournament,
      'tournament:update': onTournament,
    },
  });

  return {
    gameId,
    tournamentState: tournament.state,
    breakState: tournament.breakState,
    joined: spectator.status === 'joined',
    failed: spectator.status === 'error',
  };
}
