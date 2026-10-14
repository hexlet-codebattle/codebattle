import { useMemo } from 'react';

import type { Game } from '@/features/game/types';
import { parseStreamParams } from '@/features/stream/layout';
import { StreamArena } from '@/features/stream/StreamArena';
import { useSharedProps } from '@/shared/useSharedProps';

/** `/games/:id/stream`: the broadcast screen of one game (URL params as on the tournament stream). */
export default function GameStream() {
  const { game_id: gameId, game } = useSharedProps<{ game_id: number; game: Game }>();
  const params = useMemo(() => parseStreamParams(window.location.search), []);

  return <StreamArena gameId={gameId} initialGame={game ?? null} params={params} backHref={`/games/${gameId}`} />;
}
