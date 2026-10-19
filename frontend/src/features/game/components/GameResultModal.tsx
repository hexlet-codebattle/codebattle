import { Button, Group, Image, Modal, Stack, Text } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RoundClock } from '@/features/tournament/components/RoundClock';
import type { Tournament } from '@/features/tournament/types';
import { useSharedProps } from '@/shared/useSharedProps';
import { MethodButton } from '@/shared/MethodButton';

import { isGameOver, useGameStore } from '../store';
import type { GameApi } from '../useGame';

import { RematchControls } from './RematchControls';

// The legacy result animations (config/gifs.ts), served by Phoenix.
const GIFS = {
  won: '/assets/images/won.gif',
  lost: '/assets/images/loss.gif',
  gave_up: 'https://media.giphy.com/media/NxARrx3czdQaY/giphy.gif',
} as const;

type Outcome = keyof typeof GIFS;

/** The tournament line under the animation: what happens next. */
function TournamentNext() {
  const { t } = useTranslation();
  const tournament = useGameStore((state) => state.tournament);
  const waitType = useGameStore((state) => state.waitType);
  if (!tournament) return null;

  const active = tournament.state === 'active';
  const message =
    waitType === 'tournament'
      ? active
        ? t('That was your last game in this tournament')
        : t('Tournament finished')
      : waitType === 'round'
        ? t('Round is over, wait for the next round')
        : null;

  return (
    <Stack gap="xs" w="100%">
      {message && (
        <Text ta="center" fw={600}>
          {message}
        </Text>
      )}
      {active && (
        <RoundClock
          tournament={{ ...tournament, id: tournament.tournament_id, starts_at: null } as unknown as Tournament}
          playerRoundPosition={tournament.game_round_position}
          compact
        />
      )}
    </Stack>
  );
}

/**
 * The legacy game-over animation: a dinosaur for a win, a loss or a give-up. Opens only
 * when the game ends while the page is open, and only for the players. Casual games offer
 * a rematch here too, in sync with the top bar.
 */
export function GameResultModal({ api }: { api: GameApi }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const state = useGameStore((store) => store.game?.state);
  const result = useGameStore((store) => store.players[me.id]?.result);
  const activeGameId = useGameStore((store) => store.activeGameId);
  const game = useGameStore((store) => store.game);
  const gameId = game?.id;
  const tournament = useGameStore((store) => store.tournament);
  // Casual games offer a rematch; the opponent's offer gets a row of its own above the footer.
  const practice = game?.mode === 'training';
  const editorLang = useGameStore((store) => store.editors[me.id]?.lang ?? me.lang ?? 'js');
  const rematch = !tournament && game && !game.tournament_id && !practice ? game : null;
  const incomingRematch = rematch?.rematch_state === 'in_approval' && rematch.rematch_initiator_id !== me.id;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const wasOver = useRef(isGameOver(state));

  useEffect(() => {
    const over = isGameOver(state);
    if (over && !wasOver.current && result && result in GIFS) setOutcome(result as Outcome);
    wasOver.current = over;
  }, [state, result]);

  const won = outcome === 'won';
  // A game with an award (e.g. a tournament prize) shows it instead of the dinosaur.
  const award = useGameStore((store) => store.game?.award);
  const nextGame = activeGameId && activeGameId !== gameId ? activeGameId : null;

  if (practice) {
    return (
      <Modal opened={outcome != null} onClose={() => setOutcome(null)} centered size="md" title={won ? t('Practice complete!') : t('Keep practicing')}>
        <Stack gap="md">
          <Text>{won ? t('You passed the tests and solved the challenge. Try another task or create an account to play against people.') : t('The battle is over, but you can keep editing and running tests. Take a look at the bot’s solution if you need an idea.')}</Text>
          <Group gap="xs">
            <MethodButton action={`/games/training?lang=${encodeURIComponent(editorLang)}`} method="post" size="sm" color="green">{t('Practice again')}</MethodButton>
            <Button size="sm" variant="default" onClick={() => setOutcome(null)}>{won ? t('Review the code') : t('Keep solving')}</Button>
          </Group>
          <Button component="a" href={me.is_guest ? '/users/new' : '/'} variant="light">{me.is_guest ? t('Create an account to play people') : t('Back to lobby')}</Button>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal
      opened={outcome != null}
      onClose={() => setOutcome(null)}
      centered
      size="md"
      title={
        <Text fw={800} size="lg">
          {award ? t('Award') : won ? t("Woohoo, you're Champion!!!!!") : t("If you read this you've lost the game")}
        </Text>
      }
    >
      {outcome && (
        <Stack align="center" gap="md">
          {award ? (
            award.startsWith('http') ? (
              <Image src={award} alt={t('Game award')} radius="md" maw={400} w="100%" />
            ) : (
              <Text fz={120} lh={1}>
                {award}
              </Text>
            )
          ) : (
            <Image src={GIFS[outcome]} alt={t('animation')} radius="md" maw={400} w="100%" />
          )}
          <TournamentNext />
          {rematch && incomingRematch && <RematchControls game={rematch} api={api} me={me.id} variant="modal" />}
          <Group justify={rematch && !incomingRematch ? 'space-between' : 'flex-end'} w="100%" gap="xs" mt="xs">
            {rematch && !incomingRematch && <RematchControls game={rematch} api={api} me={me.id} variant="modal" />}
            <Group gap="xs">
              {nextGame && (
                <Button component="a" href={`/games/${nextGame}`} variant="filled" color="green" rightSection={<IconArrowRight size={14} />}>
                  {t('Next game')}
                </Button>
              )}
              {/* Secondary while a rematch or the next game is on offer. */}
              <Button
                variant={nextGame || rematch ? 'default' : 'filled'}
                color={won ? 'green' : 'gray'}
                onClick={() => setOutcome(null)}
              >
                {won ? t('GG') : t("I'll be back")}
              </Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
