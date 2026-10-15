import { Button, Group, List, Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconUserMinus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { archiveAccount } from './api';
import { Section } from './Section';

const CONFIRMATION = 'ARCHIVE';

export function DangerSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [failed, setFailed] = useState(false);

  const close = () => {
    if (archiving) return;
    setOpen(false);
    setTyped('');
    setFailed(false);
  };

  const archive = async () => {
    setArchiving(true);
    setFailed(false);
    try {
      await archiveAccount();
      window.location.assign('/');
    } catch {
      setArchiving(false);
      setFailed(true);
    }
  };

  return (
    <Section
      id="danger"
      label={t('Danger zone')}
      icon={<IconAlertTriangle size={18} />}
      title={t('Danger zone')}
      danger
    >
      <Group justify="space-between" gap="md">
        <Stack gap={2} style={{ flex: 1, minWidth: 240 }}>
          <Text fw={600}>{t('Archive account')}</Text>
          <Text size="sm" c="dimmed">
            {t('Anonymize your profile, revoke every session, and permanently disable access to this account.')}
          </Text>
        </Stack>
        <Button variant="outline" color="red" leftSection={<IconUserMinus size={16} />} onClick={() => setOpen(true)}>
          {t('Archive account')}
        </Button>
      </Group>

      <Modal opened={open} onClose={close} title={t('Archive account permanently')} centered withCloseButton={!archiving}>
        <Stack gap="md">
          <Text size="sm">
            {t(
              'This action cannot be undone. You will lose access to this account forever. You can create a new account later, but it will not restore this account.',
            )}
          </Text>
          <List size="sm" spacing={4} c="dimmed">
            <List.Item>{t('Your name is anonymized; avatar, email and linked accounts are removed')}</List.Item>
            <List.Item>{t('Every device is signed out and every API token revoked')}</List.Item>
            <List.Item>{t('Games and tournament results stay, without your name')}</List.Item>
          </List>
          <TextInput
            label={t('Type ARCHIVE to confirm')}
            value={typed}
            onChange={(event) => setTyped(event.currentTarget.value)}
            disabled={archiving}
            autoComplete="off"
            data-autofocus
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          />
          {failed && (
            <Text size="sm" c="red">
              {t('Something went wrong')}
            </Text>
          )}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={close} disabled={archiving}>
              {t('Cancel')}
            </Button>
            <Button color="red" variant="filled" onClick={archive} loading={archiving} disabled={typed !== CONFIRMATION}>
              {t('Archive permanently')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Section>
  );
}
