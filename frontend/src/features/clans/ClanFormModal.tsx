import { useForm } from '@inertiajs/react';
import { Button, Group, Modal, Stack, Switch, TextInput } from '@mantine/core';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';

import type { Clan } from './types';

interface ClanFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** Edit this clan; create a new one when null. */
  clan: Clan | null;
}

/** Create a clan (and optionally join it) or rename one (creator / admin). */
export function ClanFormModal({ opened, onClose, clan }: ClanFormModalProps) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const editing = clan != null;

  const form = useForm({
    name: clan?.name ?? '',
    long_name: clan?.long_name ?? '',
    join: true,
  });

  const close = () => {
    form.clearErrors();
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    form.transform((data) => ({
      clan: editing
        ? { name: data.name.trim(), long_name: data.long_name.trim() || null }
        : { name: data.name.trim(), long_name: data.long_name.trim() || null, join: data.join },
    }));
    // Keep the dialog open with its errors when the server sends us back.
    const options = { preserveScroll: true, preserveState: true, onSuccess: close };
    if (editing) form.patch(`/clans/${clan.id}`, options);
    else form.post('/clans', options);
  };

  return (
    <Modal opened={opened} onClose={close} title={editing ? t('Edit clan') : t('Create clan')} centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          <TextInput
            label={t('Name')}
            description={t('Short and unique, shown next to players')}
            value={form.data.name}
            onChange={(event) => form.setData('name', event.currentTarget.value)}
            error={form.errors.name}
            maxLength={256}
            required
            data-autofocus
          />
          <TextInput
            label={t('Full name')}
            description={t('Optional, e.g. a company or school')}
            value={form.data.long_name}
            onChange={(event) => form.setData('long_name', event.currentTarget.value)}
            error={form.errors.long_name}
            maxLength={256}
          />
          {!editing && (
            <Switch
              label={me.clan ? t('Leave %{clan} and join this clan', { clan: me.clan }) : t('Join this clan')}
              checked={form.data.join}
              onChange={(event) => form.setData('join', event.currentTarget.checked)}
            />
          )}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={close}>
              {t('Cancel')}
            </Button>
            <Button type="submit" variant="filled" loading={form.processing} disabled={form.data.name.trim().length < 2}>
              {editing ? t('Save') : t('Create')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
