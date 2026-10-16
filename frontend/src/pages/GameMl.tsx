import { Head } from '@inertiajs/react';
import { Alert, Button, Stack } from '@mantine/core';
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
}

/** Bot/human signal review of a game: each player's risk report from editor telemetry. */
export default function GameMl() {
  const { t } = useTranslation();
  const { game_id: gameId, can_manage: canManage = false, players = [], batches = [] } = useSharedProps<GameMlProps>();

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
          'Higher risk score / more signals → more bot-like. Always confirm by playing back the editor history. Reports are computed once and cached; Re-analyze forces a fresh run.',
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
        </Stack>
      )}
    </AppLayout>
  );
}
