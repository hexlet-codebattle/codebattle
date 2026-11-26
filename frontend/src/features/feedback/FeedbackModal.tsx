import { Link, router, usePage } from '@inertiajs/react';
import { Anchor, Button, Group, Modal, Paper, SegmentedControl, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { requestJson } from '@/shared/http';

const KINDS = ['Bug', 'Suggestion', 'Question'] as const;

/** Bug reports and ideas; they land in /admin/feedback. */
export function FeedbackModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const viewingHistory = usePage().component === 'MyFeedback';
  const [kind, setKind] = useState<string>(KINDS[0]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = () => {
    setSending(true);
    requestJson('POST', '/api/v1/feedback', {
      attachments: [{ fallback: kind, text: text.trim(), title_link: window.location.href }],
    })
      .then(() => {
        notifications.show({ color: 'green', message: t('Feedback sent, thank you') });
        setText('');
        onClose();
        if (viewingHistory) router.reload({ only: ['feedback'] });
      })
      .catch(() => notifications.show({ color: 'red', message: t('Could not send the feedback') }))
      .finally(() => setSending(false));
  };

  return (
    <Modal opened={opened} onClose={sending ? () => {} : onClose} title={t('Send feedback')} centered>
      <Stack gap="sm">
        <SegmentedControl value={kind} onChange={setKind} data={KINDS.map((value) => ({ value, label: t(value) }))} />
        <Textarea
          label={t('Message')}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          autosize
          minRows={4}
          maxRows={12}
          data-autofocus
        />
        {!viewingHistory && (
          <Paper withBorder p="sm">
            <Anchor component={Link} href="/feedback" onClick={onClose} fw={700} size="sm">
              {t('My feedback')}
            </Anchor>
            <Text size="sm" c="dimmed" mt={2}>
              {t('Read replies from the Codebattle team here.')}
            </Text>
          </Paper>
        )}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose} disabled={sending}>
            {t('Cancel')}
          </Button>
          <Button color="green" onClick={send} loading={sending} disabled={!text.trim()}>
            {t('Send')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
