import { Alert, Anchor, Button, Divider, Group, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { IconBrandDiscord, IconBrandGithub, IconCircleCheck, IconMailCheck } from '@tabler/icons-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HttpError, requestJson } from '@/shared/http';
import { MethodButton } from '@/shared/MethodButton';

import { type Errors, serverErrors, validateReset, validateSignIn, validateSignUp } from './validation';

/** `path?next=…`, keeping the page to come back to after signing in. */
export const withNext = (path: string, next: string) => (next && next !== '/' ? `${path}${path.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}` : path);

function BaseError({ errors }: { errors: Errors }) {
  if (!errors.base) return null;
  return (
    <Alert color="red" variant="light" p="xs">
      {errors.base}
    </Alert>
  );
}

/** Errors from a failed request, or a generic one (offline, 5xx without a body). */
const failure = (error: unknown): Errors =>
  error instanceof HttpError ? serverErrors(error.data) : { base: String((error as Error)?.message ?? error) };

export function SocialButtons({ next, label }: { next: string; label: 'in' | 'up' }) {
  const { t } = useTranslation();
  // The OAuth callback returns to `next` (AuthController.callback).
  return (
    <Stack gap="xs">
      <Button component="a" href={withNext('/auth/github', next)} variant="default" leftSection={<IconBrandGithub size={18} />} fullWidth>
        {label === 'in' ? t('Sign in with Github') : t('Sign up with Github')}
      </Button>
      <Button component="a" href={withNext('/auth/discord', next)} variant="default" leftSection={<IconBrandDiscord size={18} />} fullWidth>
        {label === 'in' ? t('Sign in with Discord') : t('Sign up with Discord')}
      </Button>
    </Stack>
  );
}

/** Development only (config :dev_sign_in): a fresh random user of each kind. */
export function DevSignIn() {
  return (
    <Group gap="xs" justify="center">
      {(['free', 'premium', 'admin'] as const).map((kind) => (
        <MethodButton key={kind} action={`/auth/dev_login?locale=en&subscription_type=${kind}`} method="post" size="compact-sm" variant="light" color="gray">
          Dev {kind}
        </MethodButton>
      ))}
    </Group>
  );
}

export function SignInForm({ next, verificationSent }: { next: string; verificationSent: boolean }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const local = validateSignIn(form);
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await requestJson('POST', '/api/v1/session', { email: form.email.trim(), password: form.password });
      window.location.href = next || '/';
    } catch (error) {
      setErrors(failure(error));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="sm">
        {verificationSent && (
          <Alert color="green" variant="light" icon={<IconMailCheck size={18} />} p="xs">
            {t('We sent a verification email. Please confirm your email before signing in.')}
          </Alert>
        )}
        <BaseError errors={errors} />
        <TextInput
          label={t('Email')}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.currentTarget.value })}
          error={errors.email}
          autoFocus
        />
        <PasswordInput
          label={t('Password')}
          autoComplete="current-password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.currentTarget.value })}
          error={errors.password}
        />
        <Group justify="flex-end">
          <Anchor href={withNext('/remind_password', next)} size="sm">
            {t('Forgot your password?')}
          </Anchor>
        </Group>
        <Button type="submit" color="green" loading={busy} fullWidth>
          {t('Sign In')}
        </Button>
      </Stack>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirmation: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const local = validateSignUp(form);
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await requestJson('POST', '/api/v1/users', { name: form.name.trim(), email: form.email.trim(), password: form.password });
      // The account is created once the email is verified (first sign-in).
      window.location.href = withNext('/session/new?verification=sent', next);
    } catch (error) {
      setErrors(failure(error));
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: { currentTarget: { value: string } }) => setForm({ ...form, [key]: event.currentTarget.value }),
    error: errors[key],
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="sm">
        <BaseError errors={errors} />
        <TextInput label={t('Nickname')} autoComplete="username" description={t('3–16 Latin letters, digits, - and _')} autoFocus {...field('name')} />
        <TextInput label={t('Email')} type="email" autoComplete="email" {...field('email')} />
        <PasswordInput label={t('Password')} autoComplete="new-password" description={t('At least 8 characters')} {...field('password')} />
        <PasswordInput label={t('Confirm password')} autoComplete="new-password" {...field('passwordConfirmation')} />
        <Button type="submit" color="green" loading={busy} fullWidth>
          {t('Sign Up')}
        </Button>
      </Stack>
    </form>
  );
}

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const local = validateReset({ email });
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await requestJson('POST', '/api/v1/reset_password', { email: email.trim() });
      setSent(true);
    } catch (error) {
      setErrors(failure(error));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Alert color="green" variant="light" icon={<IconCircleCheck size={18} />}>
        {t('We have sent you an email with instructions on how to reset your password')}
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {t('Enter the email of your account and we will send you a link to set a new password.')}
        </Text>
        <BaseError errors={errors} />
        <TextInput label={t('Email')} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} error={errors.email} autoFocus />
        <Button type="submit" color="green" loading={busy} fullWidth>
          {t('Reset password')}
        </Button>
      </Stack>
    </form>
  );
}

export const OrDivider = () => {
  const { t } = useTranslation();
  return <Divider label={t('or')} labelPosition="center" />;
};
