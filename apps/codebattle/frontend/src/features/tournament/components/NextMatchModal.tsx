import { Button, Group, Modal, RingProgress, Stack, Text } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
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
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const round = useTournamentStore((state) => state.tournament?.current_round_position);
  const match = useMyLiveMatch(me.id);
  const dismissed = useRef(new Set<number>());
  const [left, setLeft] = useState(COUNTDOWN_S);

  const show = match != null && match.round_position === round && !dismissed.current.has(match.game_id);

  useEffect(() => {
    if (!show || !match) return undefined;
    setLeft(COUNTDOWN_S);
    const started = Date.now();
    const timer = window.setInterval(() => {
      const remaining = COUNTDOWN_S - Math.floor((Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        window.location.replace(`/games/${match.game_id}`);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [show, match]);

  if (!show || !match) return null;

  const stay = () => {
    dismissed.current.add(match.game_id);
    setLeft(COUNTDOWN_S + 1);
  };

  return (
    <Modal opened onClose={stay} centered withCloseButton={false} size="sm">
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
          <Button variant="default" onClick={stay}>
            {t('Stay here')}
          </Button>
          <Button variant="filled" color="green" onClick={() => window.location.replace(`/games/${match.game_id}`)}>
            {t('Open now')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
