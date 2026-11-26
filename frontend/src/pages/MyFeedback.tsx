import { Head } from '@inertiajs/react';
import { Badge, Box, Button, Card, Divider, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { Timestamp } from '@/shared/sortable';
import { useSharedProps } from '@/shared/useSharedProps';

interface FeedbackItem {
  id: number;
  status: string;
  text: string;
  inserted_at: string;
  reply: string | null;
  replied_at: string | null;
}

export default function MyFeedback() {
  const { t } = useTranslation();
  const { feedback } = useSharedProps<{ feedback: FeedbackItem[] }>();
  const [opened, setOpened] = useState(false);

  return (
    <AppLayout>
      <Head title={t('My feedback')} />
      <Box maw={760} mx="auto">
        <PageHeader
          title={t('My feedback')}
          actions={<Button onClick={() => setOpened(true)}>{t('Send feedback')}</Button>}
        />
        <FeedbackModal opened={opened} onClose={() => setOpened(false)} />
        {feedback.length === 0 && (
          <Text ta="center" c="dimmed">{t('You have not sent any feedback yet.')}</Text>
        )}
        <Stack>
          {feedback.map((item) => (
            <Card component="article" key={item.id} padding="lg">
              <Stack gap="sm">
                <Group justify="space-between" gap="xs">
                  <Badge variant="light">{t(item.status)}</Badge>
                  <Timestamp value={item.inserted_at} />
                </Group>
                <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.text}</Text>
                <Divider />
                {item.reply ? (
                  <Stack gap={4}>
                    <Group justify="space-between" gap="xs">
                      <Text fw={600} size="sm">{t('Reply from Codebattle')}</Text>
                      <Timestamp value={item.replied_at} />
                    </Group>
                    <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.reply}</Text>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">{t('Awaiting reply')}</Text>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Box>
    </AppLayout>
  );
}
