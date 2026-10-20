import { ActionIcon, Alert, Button, Center, Collapse, CopyButton, Divider, Group, Modal, Stack, Text, TextInput, Title, Tooltip, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconEye,
  IconFlag,
  IconKey,
  IconLockOpen,
  IconPencil,
  IconPlayerPlay,
  IconPlayerStop,
  IconQrcode,
  IconRefresh,
  IconRotateClockwise,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { type ReactNode, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';

import type { Tournament } from '../types';
import type { TournamentApi } from '../useTournament';
import { DetailsModal } from './DetailsModal';

// Port of the legacy TournamentMainControlButtons + the admin pane of TournamentHeader:
// the same buttons, enable rules, confirmation modals and invite link / QR.

interface Confirmation {
  title: string;
  heading: string;
  text?: ReactNode;
  confirmLabel: string;
  color: string;
  event: string;
}

function ConfirmModal({
  confirmation,
  onClose,
  onConfirm,
}: {
  confirmation: Confirmation | null;
  onClose: () => void;
  onConfirm: (event: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal opened={confirmation != null} onClose={onClose} title={confirmation?.title} centered>
      {confirmation && (
        <Stack gap="md">
          <Title order={4}>{confirmation.heading}</Title>
          {confirmation.text && (
            <Text size="sm" c="dimmed" component="div">
              {confirmation.text}
            </Text>
          )}
          <Group justify="space-between">
            <Button variant="default" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button
              variant="filled"
              color={confirmation.color}
              onClick={() => {
                onConfirm(confirmation.event);
                onClose();
              }}
            >
              {confirmation.confirmLabel}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

interface ModeratorControlsProps {
  tournament: Tournament;
  api: TournamentApi;
}

export function ModeratorControls({ tournament, api }: ModeratorControlsProps) {
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [controlsOpened, setControlsOpened] = useState(false);
  const controlsId = useId();
  const theme = useMantineTheme();
  const compact = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const { state, break_state: breakState, is_live: isLive } = tournament;
  const disabled = api.adminStatus !== 'joined';
  const hideResults = !tournament.show_results;

  const canStart = isLive && state === 'waiting_participants' && tournament.players_count > 0;
  const canStartRound = isLive && state === 'active' && breakState === 'on';
  const canFinishRound = isLive && state === 'active' && breakState === 'off';
  const canFinishTournament = state === 'active';
  const canRestart = !isLive || state === 'active' || state === 'finished' || state === 'canceled';

  const accessUrl =
    tournament.access_type === 'token' && tournament.access_token
      ? `${window.location.origin}/tournaments/${tournament.id}?access_token=${tournament.access_token}`
      : null;

  // Most admin events never reply; the effect arrives as tournament events.
  const send = (event: string) => api.adminCast(event);

  const roundDetails = (
    <Group gap="xs" justify="center">
      <span>
        {t('Seconds:')} {tournament.match_timeout_seconds ?? '—'}
      </span>
      {tournament.task_provider === 'task_pack' && (
        <span>
          {t('Task pack name:')} {tournament.task_pack_name}
        </span>
      )}
      {tournament.task_provider === 'level' && tournament.level && (
        <span>
          {t('Task level:')} {levelLabel(tournament.level as GameLevel)}
        </span>
      )}
    </Group>
  );

  const startConfirmation = (first: boolean): Confirmation => ({
    title: first ? t('Start tournament confirmation') : t('Start next round'),
    heading: first ? t('Are you sure you want to start the tournament?') : t('Are you sure you want to start the round?'),
    text: roundDetails,
    confirmLabel: t('Confirm'),
    color: 'green',
    event: first ? 'tournament:start' : 'tournament:start_round',
  });

  return (
    <>
      <Button
        hiddenFrom="sm"
        size="compact-sm"
        variant="default"
        leftSection={<IconSettings size={14} />}
        onClick={() => setControlsOpened((opened) => !opened)}
        aria-expanded={controlsOpened}
        aria-controls={controlsId}
      >
        {t('Tournament flow')}
      </Button>
      <Collapse expanded={!compact || controlsOpened} id={controlsId}>
        <Stack gap="xs">
          <Group gap={6} aria-label={t('Tournament flow')}>
            {canStartRound && (
              <Button
                size="compact-sm"
                color="green"
                leftSection={<IconArrowRight size={14} />}
                disabled={disabled}
                onClick={() => setConfirmation(startConfirmation(false))}
              >
                {t('Start Round')}
              </Button>
            )}
            {canFinishRound && (
              <Button
                size="compact-sm"
                color="green"
                leftSection={<IconFlag size={14} />}
                disabled={disabled}
                onClick={() => send('tournament:finish_round')}
              >
                {t('Finish Round')}
              </Button>
            )}
            {canFinishTournament && (
              <Button
                size="compact-sm"
                variant="default"
                leftSection={<IconPlayerStop size={14} />}
                disabled={disabled}
                onClick={() =>
                  setConfirmation({
                    title: t('Finish tournament'),
                    heading: t('Are you sure you want to finish this tournament?'),
                    text: t('This will end the tournament and finalize all results.'),
                    confirmLabel: t('Finish tournament'),
                    color: 'red',
                    event: 'tournament:finish',
                  })
                }
              >
                {t('Finish Tournament')}
              </Button>
            )}
            {canRestart ? (
              <Button
                size="compact-sm"
                variant="default"
                leftSection={<IconRefresh size={14} />}
                disabled={disabled}
                onClick={() =>
                  setConfirmation({
                    title: t('Reset tournament progress'),
                    heading: t('Are you sure you want to reset this tournament?'),
                    text: t('This action is destructive. All tournament progress, matches, and results will be lost.'),
                    confirmLabel: t('Reset tournament'),
                    color: 'red',
                    event: 'tournament:restart',
                  })
                }
              >
                {t('Restart')}
              </Button>
            ) : (
              <Button
                size="compact-sm"
                color="green"
                leftSection={<IconPlayerPlay size={14} />}
                disabled={!canStart || disabled}
                onClick={() => setConfirmation(startConfirmation(true))}
              >
                {t('Start')}
              </Button>
            )}
            <Button
              size="compact-sm"
              variant="default"
              leftSection={<IconRotateClockwise size={14} />}
              disabled={disabled}
              onClick={() =>
                setConfirmation({
                  title: t('Retry tournament'),
                  heading: t('Are you sure you want to retry this tournament?'),
                  text: t('This will clear tournament games and results, then restore the current player roster.'),
                  confirmLabel: t('Retry tournament'),
                  color: 'red',
                  event: 'tournament:retry',
                })
              }
            >
              {t('Retry')}
            </Button>
            <Button
              size="compact-sm"
              variant="default"
              leftSection={<IconEye size={14} />}
              disabled={disabled || !hideResults}
              onClick={() => send('tournament:toggle_show_results')}
            >
              {t('Show Results')}
            </Button>
            <Button
              size="compact-sm"
              color="red"
              leftSection={<IconTrash size={14} />}
              disabled={disabled}
              onClick={() => send('tournament:cancel')}
            >
              {t('Cancel')}
            </Button>
            <Divider orientation="vertical" mx={2} />
            <Tooltip label={t('Edit')}>
              <ActionIcon component="a" href={`/tournaments/${tournament.id}/edit`} variant="default" size={30} aria-label={t('Edit')}>
                <IconPencil size={15} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('Tournament details')}>
              <ActionIcon variant="default" size={30} onClick={() => setDetailsOpened(true)} aria-label={t('Tournament details')}>
                <IconSettings size={15} />
              </ActionIcon>
            </Tooltip>
            {tournament.access_type === 'token' && (
              <Button
                size="compact-sm"
                variant="default"
                leftSection={<IconLockOpen size={14} />}
                disabled={disabled}
                onClick={() => send('tournament:open_up')}
              >
                {t('Open up')}
              </Button>
            )}
          </Group>

          {accessUrl && (
            <Stack gap="xs" pt="xs" style={{ borderTop: '1px solid var(--cb-border)' }}>
              <Group gap={6} wrap="nowrap">
                <TextInput size="compact-sm" readOnly value={accessUrl} leftSection={<IconKey size={14} />} aria-label={t('Access token')} style={{ flex: 1 }} />
                <CopyButton value={accessUrl}>
                  {({ copied, copy }) => (
                    <Button
                      size="compact-sm"
                      variant="default"
                      leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      disabled={!isLive || disabled}
                      onClick={copy}
                    >
                      {copied ? t('Copied') : t('Copy')}
                    </Button>
                  )}
                </CopyButton>
                <Button
                  size="compact-sm"
                  variant="default"
                  leftSection={<IconQrcode size={14} />}
                  onClick={() => setShowQr((value) => !value)}
                  aria-expanded={showQr}
                >
                  {showQr ? t('Hide QR') : t('Show QR')}
                </Button>
              </Group>
              {showQr && (
                <Center p="sm" bg="white" style={{ borderRadius: 'var(--cb-radius)', alignSelf: 'center' }}>
                  <QRCodeSVG value={accessUrl} size={280} />
                </Center>
              )}
            </Stack>
          )}

          {!isLive && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />} p="xs">
              {t('Tournament process is dead. Click Restart to make it live again so users can join.')}
            </Alert>
          )}
        </Stack>
      </Collapse>

      <ConfirmModal confirmation={confirmation} onClose={() => setConfirmation(null)} onConfirm={send} />
      <DetailsModal tournament={tournament} opened={detailsOpened} onClose={() => setDetailsOpened(false)} />
    </>
  );
}
