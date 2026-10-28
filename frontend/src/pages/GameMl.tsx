import { Head, router } from '@inertiajs/react';
import { Alert, Button, NativeSelect, NumberInput, Paper, Stack, Textarea } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { BatchCharts, CodeColumns, type MlColumn, PlayerHeaders, VersusTable } from '@/features/gameMl/Comparison';
import { PLAYER_COLORS } from '@/features/gameMl/format';
import type { MlBatch, MlPlayer } from '@/features/gameMl/types';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from GameController.ml (everyone once the game is over; admins and moderators always).
interface GameMlProps {
  game_id: number;
  /** Admins and moderators: may force a fresh analysis. */
  can_manage?: boolean;
  players: MlPlayer[];
  batches: MlBatch[];
  reviews?: { id: number; user_id: number; reviewer_id: number; outcome: string; reason: string; replay_offset_ms: number | null }[];
}

/** Bot/human signal review of a game: each player's risk report from editor telemetry. */
export default function GameMl() {
  const { t } = useTranslation();
  const { game_id: gameId, can_manage: canManage = false, players = [], batches = [], reviews = [] } = useSharedProps<GameMlProps>();

  // One column per player, left to right: verdict, per-batch charts, the metrics head to head, code.
  const columns = useMemo<MlColumn[]>(() => {
    const byUser = new Map<number, MlBatch[]>();
    for (const batch of batches) byUser.set(batch.user_id, [...(byUser.get(batch.user_id) ?? []), batch]);
    for (const list of byUser.values()) list.sort((a, b) => (a.window_start_offset_ms ?? 0) - (b.window_start_offset_ms ?? 0));
    return players.map((player: MlPlayer, index) => ({
      player,
      batches: byUser.get(player.id) ?? [],
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    }));
  }, [players, batches]);

  return (
    <AppLayout wide>
      <Head title={t('Game #%{id}: bot/human signal review', { id: gameId })} />
      <PageHeader
        title={t('Game #%{id}: bot/human signal review', { id: gameId })}
        subtitle={t(
          'Review aid, not a bot verdict. Missing signals do not prove fair play. Confirm against the replay before taking action.',
        )}
        actions={
          <>
            {canManage && (
              <Button component="a" href={`/games/${gameId}/ml?refresh=1`} variant="default" size="compact-sm" leftSection={<IconRefresh size={14} />}>
                {t('Re-analyze')}
              </Button>
            )}
            <Button component="a" href={`/games/${gameId}`} variant="subtle" size="compact-sm" leftSection={<IconArrowLeft size={14} />}>
              {t('Back to game')}
            </Button>
          </>
        }
      />

      {players.length === 0 ? (
        <Alert variant="light" color="orange" icon={<IconAlertTriangle size={16} />}>
          {t('No players found for this game.')}
        </Alert>
      ) : (
        <Stack gap="lg">
          <PlayerHeaders columns={columns} />
          <BatchCharts columns={columns} />
          <VersusTable columns={columns} />
          <CodeColumns columns={columns} />
          {canManage && players.filter(player => !player.is_bot).map(player => (
            <form key={player.id} onSubmit={event => {
              event.preventDefault();
              const data = Object.fromEntries(new FormData(event.currentTarget));
              router.post(`/games/${gameId}/ml/reviews`, { ...data, user_id: player.id });
            }}>
              <Paper withBorder p="md"><Stack gap="xs">
                <strong>{t('Moderator review')}: {player.name}</strong>
                <NativeSelect name="outcome" label={t('Outcome')} required data={[
                  { value: 'inconclusive', label: t('Inconclusive') },
                  { value: 'legitimate', label: t('Legitimate') },
                  { value: 'confirmed_assistance', label: t('Confirmed unauthorized assistance') },
                ]} />
                <NumberInput label={t('Replay position (ms)')} name="replay_offset_ms" min={0} allowDecimal={false} />
                <Textarea label={t('Reason')} name="reason" required minLength={10} maxLength={5000} />
                <Button type="submit">{t('Save review')}</Button>
                {reviews.filter(review => review.user_id === player.id).map(review => (
                  <div key={review.id}>{review.outcome}: {review.reason} ({t('Reviewer')} #{review.reviewer_id}, {review.replay_offset_ms ?? '—'} ms)</div>
                ))}
              </Stack></Paper>
            </form>
          ))}
        </Stack>
      )}
    </AppLayout>
  );
}
