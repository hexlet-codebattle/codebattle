import { Alert, Button, Divider, Group, PasswordInput, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconLock, IconMail } from '@tabler/icons-react';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type AccountUser, firstErrors, RequestError, requestEmailChange, updatePassword } from './api';
import { Section } from './Section';

const PASSWORD_MIN = 8;
// bcrypt only uses the first 72 bytes (~36 Cyrillic letters); the server rejects longer ones.
const PASSWORD_MAX_BYTES = 72;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const { t } = useTranslation();
  const [values, setValues] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _stale, ...rest }) => rest);
  };

  const tooShort = values.password.length > 0 && values.password.length < PASSWORD_MIN;
  const tooLong = byteLength(values.password) > PASSWORD_MAX_BYTES;
  const mismatch = values.password_confirmation.length > 0 && values.password_confirmation !== values.password;
  const ready = Boolean(values.current_password && values.password && values.password_confirmation) && !tooShort && !tooLong && !mismatch;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updatePassword(values);
      setValues({ current_password: '', password: '', password_confirmation: '' });
      notifications.show({ color: 'green', message: t('Password changed. Other devices were signed out.') });
      onChanged();
    } catch (error) {
      if (error instanceof RequestError && Object.keys(error.errors).length) setErrors(firstErrors(error.errors));
      else notifications.show({ color: 'red', message: t('Something went wrong') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        <Group gap={8}>
          <IconLock size={16} />
          <Title order={5}>{t('Change password')}</Title>
        </Group>
        <PasswordInput
          label={t('Current password')}
          autoComplete="current-password"
          value={values.current_password}
          onChange={set('current_password')}
          error={errors.current_password}
          data-testid="currentPasswordInput"
        />
        <PasswordInput
          label={t('New password')}
          description={t('At least 8 characters, any symbols')}
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          error={
            errors.password ??
            (tooShort ? t('Should be at least 8 characters') : tooLong ? t('Is too long') : undefined)
          }
          data-testid="passwordInput"
        />
        <PasswordInput
          label={t('Confirm new password')}
          autoComplete="new-password"
          value={values.password_confirmation}
          onChange={set('password_confirmation')}
          error={errors.password_confirmation ?? (mismatch ? t('Passwords must match') : undefined)}
          data-testid="passwordConfirmationInput"
        />
        <Text size="xs" c="dimmed">
          {t('Changing it signs you out on other devices and revokes your API tokens.')}
        </Text>
        <Group justify="flex-end">
          <Button type="submit" variant="filled" loading={saving} disabled={!ready}>
            {t('Change password')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidEmail = email.length > 0 && !EMAIL_FORMAT.test(email.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await requestEmailChange({ email: email.trim(), current_password: password });
      setSentTo(email.trim());
      setEmail('');
      setPassword('');
    } catch (error) {
      if (error instanceof RequestError && Object.keys(error.errors).length) setErrors(firstErrors(error.errors));
      else notifications.show({ color: 'red', message: t('Something went wrong') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        <Group gap={8}>
          <IconMail size={16} />
          <Title order={5}>{t('Change email')}</Title>
        </Group>
        <TextInput label={t('Current email')} value={currentEmail} readOnly />
        <TextInput
          label={t('New email')}
          type="email"
          autoComplete="email"
          placeholder={t('Enter new email')}
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          error={errors.email ?? (invalidEmail ? t('Invalid email') : undefined)}
          data-testid="newEmailInput"
        />
        <PasswordInput
          label={t('Current password')}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          error={errors.current_password}
          data-testid="emailCurrentPasswordInput"
        />
        {errors.base && (
          <Text size="sm" c="red">
            {errors.base}
          </Text>
        )}
        {sentTo && (
          <Alert color="green" icon={<IconMail size={16} />} withCloseButton onClose={() => setSentTo(null)}>
            {t('Verification email sent to %{email}. Confirm the new address to finish the change.', { email: sentTo })}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button type="submit" variant="filled" loading={saving} disabled={!email || !password || invalidEmail}>
            {t('Send verification email')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

interface SecuritySectionProps {
  account: AccountUser;
  /** After a password change: other sessions and all API tokens are gone. */
  onPasswordChanged: () => void;
}

export function SecuritySection({ account, onPasswordChanged }: SecuritySectionProps) {
  const { t } = useTranslation();
  const canChangeEmail = Boolean(account.has_firebase_auth && account.email);

  return (
    <Section
      id="security"
      label={t('Security')}
      icon={<IconLock size={18} />}
      title={t('Sign-in & security')}
      description={t('Password and email you sign in with.')}
    >
      {account.has_password || canChangeEmail ? (
        <SimpleGrid cols={{ base: 1, md: account.has_password && canChangeEmail ? 2 : 1 }} spacing="xl" verticalSpacing="xl">
          {account.has_password && <PasswordForm onChanged={onPasswordChanged} />}
          {account.has_password && canChangeEmail && <Divider hiddenFrom="md" />}
          {canChangeEmail && <EmailForm currentEmail={account.email!} />}
        </SimpleGrid>
      ) : (
        <Alert color="gray" icon={<IconInfoCircle size={16} />}>
          {t('You sign in with a linked account, so there is no password to change here.')}
        </Alert>
      )}
    </Section>
  );
}
