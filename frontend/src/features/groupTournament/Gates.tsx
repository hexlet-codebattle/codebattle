import { Anchor, Button, Card, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconClock, IconCode, IconExternalLink } from '@tabler/icons-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Invite, TournamentMeta } from './types';
import classes from './GroupTournament.module.css';

function Fact({ iconUrl, fallback, label }: { iconUrl?: string; fallback: ReactNode; label: string }) {
  return (
    <Stack gap={6} align="center" maw={220}>
      {iconUrl ? <Image src={iconUrl} alt="" w={40} h={40} fit="contain" /> : fallback}
      <Text size="sm" ta="center">
        {label}
      </Text>
    </Stack>
  );
}

interface InvitationPanelProps {
  name: string;
  meta: TournamentMeta;
  repoUrl: string | null | undefined;
  invite: Invite;
  onStart: () => Promise<void>;
}

/** External-platform tournaments: accept the organization invite, then start. Texts come from meta. */
export function InvitationPanel({ name, meta, repoUrl, invite, onStart }: InvitationPanelProps) {
  const { t } = useTranslation();
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const accepted = invite.state === 'accepted';
  const detailsUrl = meta.tournament_details_url || repoUrl || null;
  const detailsLabel = meta.tournament_details_label || t('tournament');

  const start = async () => {
    setStarting(true);
    setFailed(false);
    try {
      await onStart();
    } catch {
      setFailed(true);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card maw={760} mx="auto" mt="lg" padding="xl">
      <Stack gap="lg">
        <Stack gap={6} align="center" ta="center">
          <Title order={2} tt="uppercase">
            {name || t('Group Tournament')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('Find tournament details at')}{' '}
            {detailsUrl ? (
              <Anchor href={detailsUrl} target="_blank" rel="noopener noreferrer" inherit>
                {detailsLabel}
              </Anchor>
            ) : (
              detailsLabel
            )}
          </Text>
        </Stack>

        <Group justify="center" gap="xl" align="flex-start">
          <Fact
            iconUrl={meta.task_info_icon_url}
            fallback={<IconCode size={32} stroke={1.4} />}
            label={meta.task_info_label || t('Task is solved in External Plaform')}
          />
          <Fact
            iconUrl={meta.task_duration_icon_url}
            fallback={<IconClock size={32} stroke={1.4} />}
            label={meta.task_duration_label || t('30 minutes to solve')}
          />
        </Group>

        <Stack gap="xs">
          <Text fw={700} ta="center">
            {meta.steps_title || t('Before you begin:')}
          </Text>
          <div className={classes.step}>
            <Text size="sm">{meta.step1_label || t('Join our External Platform organization to receive the task')}</Text>
            {accepted ? (
              <Button variant="light" color="green" leftSection={<IconCheck size={16} />} disabled>
                {t('Accepted')}
              </Button>
            ) : invite.invite_link ? (
              <Button component="a" href={invite.invite_link} target="_blank" rel="noopener noreferrer" variant="default" rightSection={<IconExternalLink size={14} />}>
                {meta.step1_button_label || t('Accept invitation')}
              </Button>
            ) : (
              <Button variant="default" disabled>
                {meta.step1_button_label || t('Accept invitation')}
              </Button>
            )}
          </div>
          <div className={classes.step}>
            <Text size="sm">{meta.step2_label || t('Once all steps are complete, you can start solving')}</Text>
            <Button variant="default" onClick={start} loading={starting} disabled={!accepted}>
              {meta.step2_button_label || t('Go to task')}
            </Button>
          </div>
          {failed && (
            <Text size="sm" c="var(--cb-danger)" ta="center">
              {t('Could not start the tournament, try again')}
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

/** The external platform account couldn't be found for the player. */
export function PlatformErrorPanel({ onRetry }: { onRetry: () => Promise<void> }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      await onRetry();
    } catch {
      // The panel stays; the player can retry again.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card maw={520} mx="auto" mt="xl" padding="xl">
      <Stack align="center" gap="sm">
        <IconAlertTriangle size={36} stroke={1.4} color="var(--cb-danger)" />
        <Text ta="center">{t('Could not retrieve your external platform credentials. Please contact support.')}</Text>
        <Button variant="default" onClick={retry} loading={busy}>
          {t('Retry')}
        </Button>
      </Stack>
    </Card>
  );
}
