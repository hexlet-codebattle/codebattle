import { Button, Group, Modal, RingProgress, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';

import { useTournamentStore } from '../store';
import { useMyLiveMatch } from './PlayerBar';

const COUNTDOWN_S = 15;

/**
 * When the user's next match starts (current round, playing), count down and open
 * the game, like the legacy MatchConfirmationModal. "Stay here" skips that game.
 */
export function NextMatchModal() {
  const { current_user: me } = useSharedProps();
  const round = useTournamentStore((state) => state.tournament?.current_round_position);
  const match = useMyLiveMatch(me.id);
  const [dismissed, setDismissed] = useState<ReadonlySet<number>>(() => new Set());

  if (!match || match.round_position !== round || dismissed.has(match.game_id)) return null;

  const { game_id: gameId } = match;
  // Keyed by game: every new match starts its own countdown.
  return <Countdown key={gameId} gameId={gameId} onStay={() => setDismissed((current) => new Set(current).add(gameId))} />;
}

function Countdown({ gameId, onStay }: { gameId: number; onStay: () => void }) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(COUNTDOWN_S);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const remaining = COUNTDOWN_S - Math.floor((Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        window.location.replace(`/games/${gameId}`);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [gameId]);

  return (
    <Modal opened onClose={onStay} centered withCloseButton={false} size="sm">
      <Stack align="center" gap="md" py="sm">
        <RingProgress
          size={110}
          thickness={8}
          roundCaps
          sections={[{ value: (Math.max(left, 0) / COUNTDOWN_S) * 100, color: 'green' }]}
          label={
            <Text ta="center" ff="var(--cb-font-display)" fz={30} fw={800}>
              {Math.max(left, 0)}
            </Text>
          }
        />
        <Text fw={700} fz="lg" ta="center">
          {t('Your next match is ready')}
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          {t('The game opens automatically.')}
        </Text>
        <Group gap="xs">
          <Button variant="default" onClick={onStay}>
            {t('Stay here')}
          </Button>
          <Button variant="filled" color="green" onClick={() => window.location.replace(`/games/${gameId}`)}>
            {t('Open now')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
