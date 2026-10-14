import { Badge, Button, Group, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { requestJson } from '@/shared/http';

const COLORS: Record<string, string> = { complete: 'green', banned: 'red', incomplete: 'gray' };

/**
 * Admins mark a finished game's recording as a good solution (bots replay "complete"
 * playbooks) or reject it (legacy ApprovePlaybookButtons).
 */
export function PlaybookReview({ gameId, initial }: { gameId: number; initial: string | null }) {
  const { t } = useTranslation();
  const [solutionType, setSolutionType] = useState(initial);
  const [busy, setBusy] = useState(false);

  const review = async (action: 'approve' | 'reject') => {
    setBusy(true);
    try {
      const reply = await requestJson<{ solution_type?: string; errors?: string[] }>('POST', `/api/v1/playbooks/${action}`, { game_id: gameId });
      if (reply.errors?.length) throw new Error(reply.errors[0]);
      setSolutionType(reply.solution_type ?? null);
    } catch {
      notifications.show({ color: 'red', message: t('Could not update the playbook') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group gap={6} wrap="nowrap">
      {solutionType && (
        <Tooltip label={t('Playbook status')}>
          <Badge variant="light" color={COLORS[solutionType] ?? 'gray'}>
            {solutionType}
          </Badge>
        </Tooltip>
      )}
      <Button size="compact-xs" color="green" variant="light" leftSection={<IconCheck size={12} />} loading={busy} disabled={solutionType === 'complete'} onClick={() => void review('approve')}>
        {t('Approve')}
      </Button>
      <Button size="compact-xs" color="red" variant="light" leftSection={<IconX size={12} />} loading={busy} disabled={solutionType === 'banned'} onClick={() => void review('reject')}>
        {t('Reject')}
      </Button>
    </Group>
  );
}
