import { router } from '@inertiajs/react';
import { Anchor, Button, Group, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowUpRight, IconUser } from '@tabler/icons-react';
import { type FormEvent, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { LangIcon } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import { type AccountUser, firstErrors, RequestError, type SettingsResponse, updateSettings } from './api';
import { Section } from './Section';
import classes from './Settings.module.css';

const NAME_MAX = 16;
const NAME_FORMAT = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

// Same rules as User.settings_changeset/2; they only apply when the name changes,
// so legacy OAuth names keep working until edited.
function validateName(name: string, original: string, t: TFunction) {
  if (name === original) return null;
  if (!name.trim()) return t("Field can't be empty");
  if (name.length < 3) return t('Should be at least 3 characters');
  if (name.length > NAME_MAX) return t('Should be 16 character(s) or less');
  if (!NAME_FORMAT.test(name)) return t('Latin letters, digits, - and _; starts with a letter');
  return null;
}

interface ProfileSectionProps {
  account: AccountUser;
  onSaved: (fields: SettingsResponse) => void;
}

export function ProfileSection({ account, onSaved }: ProfileSectionProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(account.name);
  const [clan, setClan] = useState(account.clan ?? '');
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const nameError = validateName(name, account.name, t) ?? serverErrors.name;
  const changed = name !== account.name || clan.trim() !== (account.clan ?? '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setServerErrors({});
    try {
      const saved = await updateSettings({ name, clan: clan.trim() });
      onSaved(saved);
      setClan(saved.clan ?? '');
      notifications.show({ color: 'green', message: t('Profile updated') });
      // The header shows the name from the shared props.
      router.reload({ only: ['current_user'] });
    } catch (error) {
      if (error instanceof RequestError && error.status === 422) setServerErrors(firstErrors(error.errors));
      else notifications.show({ color: 'red', message: t('Something went wrong') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      id="profile"
      label={t('Profile')}
      icon={<IconUser size={18} />}
      title={t('Profile')}
      description={t('Manage your public identity.')}
    >
      <form onSubmit={submit}>
        <Stack gap="lg">
          <div className={classes.preview}>
            <UserAvatar user={account} size={56} radius="md" />
            <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Group gap={6} wrap="nowrap">
                <LangIcon lang={account.lang} size={18} />
                <Text fw={700} fz="lg" c="bright" truncate>
                  {name || account.name}
                </Text>
              </Group>
              <Text size="sm" c="dimmed" truncate>
                {clan.trim() || t('No clan')}
                {account.rating != null && ` · ${t('Elo')} ${account.rating}`}
              </Text>
            </Stack>
            <Anchor href={`/users/${account.id}`} size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              <Group gap={2} wrap="nowrap">
                {t('Public profile')}
                <IconArrowUpRight size={14} />
              </Group>
            </Anchor>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label={t('Your name')}
              description={t('3–16 Latin letters, digits, - or _')}
              placeholder={t('Enter your name')}
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value);
                setServerErrors(({ name: _stale, ...rest }) => rest);
              }}
              error={nameError}
              rightSection={
                <Text size="xs" c={name.length > NAME_MAX ? 'red' : 'dimmed'} ff="monospace">
                  {name.length}
                </Text>
              }
              rightSectionWidth={36}
              autoComplete="nickname"
              data-testid="nameInput"
            />
            <TextInput
              label={t('Your clan')}
              description={
                <>
                  {t('Leave empty to leave your clan.')}{' '}
                  <Anchor href="/clans" size="xs">
                    {t('clan list')}
                  </Anchor>
                </>
              }
              placeholder={t('Enter your clan')}
              value={clan}
              onChange={(event) => setClan(event.currentTarget.value)}
              error={serverErrors.clan}
              data-testid="clanInput"
            />
          </SimpleGrid>

          <Group justify="flex-end" gap="xs">
            {changed && (
              <Button
                variant="subtle"
                onClick={() => {
                  setName(account.name);
                  setClan(account.clan ?? '');
                  setServerErrors({});
                }}
              >
                {t('Reset')}
              </Button>
            )}
            <Button type="submit" variant="filled" loading={saving} disabled={!changed || Boolean(nameError)}>
              {t('Update profile')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Section>
  );
}
