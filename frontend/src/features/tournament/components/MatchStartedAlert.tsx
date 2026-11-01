import { useState } from 'react';

import { useMainEvent } from '@/api/mainEvents';
import { playTournamentSound } from '@/shared/sound';

import { MatchCountdown } from './NextMatchModal';

interface MatchStarted {
  game_id: number;
  tournament_id: number;
}

/**
 * Away from the tournament (lobby, profile, another game…), the user's tournament match
 * starting counts down and opens it, like NextMatchModal does on the tournament page.
 * `tournamentId`: the tournament this page already follows (its game pages move on by themselves).
 */
export function MatchStartedAlert({ tournamentId = null }: { tournamentId?: number | null }) {
  const [match, setMatch] = useState<MatchStarted | null>(null);

  useMainEvent('tournament:match_started', (started: MatchStarted) => {
    const path = window.location.pathname.replace(/\/$/, '');
    if (started.tournament_id === tournamentId) return;
    if (path === `/tournaments/${started.tournament_id}` || path === `/games/${started.game_id}`) return;

    playTournamentSound('roundStarted');
    setMatch(started);
  });

  if (!match) return null;

  return <MatchCountdown key={match.game_id} gameId={match.game_id} onStay={() => setMatch(null)} />;
}
