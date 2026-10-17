import { Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MethodButton } from '@/shared/MethodButton';
import { useSharedProps } from '@/shared/useSharedProps';

import { useGameStore } from '../store';

export function PracticeGuide() {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const output = useGameStore((state) => state.outputs[me.id]);
  const editor = useGameStore((state) => state.editors[me.id]);
  const [open, setOpen] = useState(true);
  const solved = output?.status === 'ok';
  const checked = output && !['initial', 'started'].includes(output.status);

  return (
    <Paper withBorder p="sm" radius={0}>
      <Group justify="space-between" gap="xs">
        <Badge variant="light" color="green">{t('Practice bot')} · {t('Unrated')}</Badge>
        <Button size="compact-xs" variant="subtle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="practice-help">
          {open ? t('Hide tips') : t('Show tips')}
        </Button>
      </Group>
      {open && (
        <Stack id="practice-help" gap={6} mt="xs" aria-live="polite">
          <Text size="sm" fw={600}>
            {solved ? t('You solved it! Ready for another challenge?') : checked ? t('Use the test results to improve your solution, then run it again.') : t('Read the task, write your solution on the left, then press Run to check it.')}
          </Text>
          <Text size="xs" c="dimmed">{t('Keep the function signature and return your answer. The bot is on the right; you can keep solving after it finishes.')}</Text>
          {solved && (
            <Group gap="xs">
              <MethodButton action={`/games/training?lang=${encodeURIComponent(editor?.lang ?? me.lang ?? 'js')}`} method="post" color="green">{t('Practice again')}</MethodButton>
              <Button component="a" href={me.is_guest ? '/users/new' : '/'} size="compact-xs" variant="default">{me.is_guest ? t('Create an account to play people') : t('Back to lobby')}</Button>
            </Group>
          )}
        </Stack>
      )}
    </Paper>
  );
}
