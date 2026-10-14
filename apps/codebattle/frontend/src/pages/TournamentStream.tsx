import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChannel } from '@/api/useChannel';
import type { Game } from '@/features/game/types';
import { StreamWaiting } from '@/features/stream/bodies';
import { parseStreamParams } from '@/features/stream/layout';
import { StreamArena } from '@/features/stream/StreamArena';
import { useSharedProps } from '@/shared/useSharedProps';

interface Props {
  tournament_id: number;
  game_id: number | null;
  game: Game | null;
}

/**
 * `/tournaments/:id/stream` (moderators): the broadcast arena of whichever game the
 * admin picked for the stream (`stream:<id>` → `stream:active_game_selected`).
 */
export default function TournamentStream() {
  const { t } = useTranslation();
  const { tournament_id: tournamentId, game_id: initialGameId, game: initialGame } = useSharedProps<Props>();
  const params = useMemo(() => parseStreamParams(window.location.search), []);
  const [gameId, setGameId] = useState<number | null>(initialGameId ?? null);

  const follow = (id?: number | null) => {
    if (id) setGameId((current) => (current === id ? current : id));
  };

  useChannel(`stream:${tournamentId}`, {
    onJoin: ({ active_game_id: activeId }: { active_game_id?: number | null }) => follow(activeId),
    events: { 'stream:active_game_selected': ({ id }: { id?: number }) => follow(id) },
  });

  if (!gameId) return <StreamWaiting label={t('Waiting for the next match...')} />;

  // A new game remounts the arena; only the page's own game starts from its props.
  return (
    <StreamArena
      key={gameId}
      gameId={gameId}
      initialGame={gameId === initialGameId ? initialGame : null}
      params={params}
      backHref={`/tournaments/${tournamentId}`}
    />
  );
}
