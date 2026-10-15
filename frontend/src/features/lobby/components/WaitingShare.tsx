import { Alert, Button, Center, CopyButton, Group, Loader, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

import { shareableGameUrl } from '@/features/chat/linkify';

interface WaitingShareProps {
  gameId: number;
  onCancelGame: (gameId: number) => void;
  onClose: () => void;
}

/**
 * Shown in the create modal once a random-player game exists: the invite is already in
 * the lobby chat, and here is the link and a QR code to share it elsewhere.
 */
export function WaitingShare({ gameId, onCancelGame, onClose }: WaitingShareProps) {
  const { t } = useTranslation();
  const link = shareableGameUrl(gameId);

  return (
    <Stack gap="lg">
      <Alert color="green" icon={<IconCheck size={18} />} title={t('Battle created')}>
        {t('The link is posted to the lobby chat. The game starts as soon as someone joins.')}
      </Alert>

      <TextInput
        readOnly
        value={link}
        onFocus={(event) => event.currentTarget.select()}
        rightSectionWidth={40}
        rightSection={
          <CopyButton value={link}>
            {({ copied, copy }) => (
              <Button size="compact-xs" variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} aria-label={t('Copy')}>
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </Button>
            )}
          </CopyButton>
        }
      />

      {/* White backing so the code scans in the dark theme too. */}
      <Center p="sm" bg="white" style={{ borderRadius: 'var(--cb-radius)', alignSelf: 'center' }}>
        <QRCodeSVG value={link} size={200} />
      </Center>

      <Group justify="space-between">
        <Group gap="xs">
          <Loader type="dots" size="sm" />
          <Text size="sm" c="dimmed">
            {t('Waiting for an opponent')}
          </Text>
        </Group>
        <Group gap="xs">
          <Button variant="default" onClick={onClose}>
            {t('Close')}
          </Button>
          <Button color="red" variant="light" onClick={() => onCancelGame(gameId)}>
            {t('Cancel game')}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
