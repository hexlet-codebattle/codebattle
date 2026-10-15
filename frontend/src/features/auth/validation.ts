import { t } from '@/i18n';

// Client checks matching the server (Codebattle.Auth.FirebaseUser) and the legacy form
// rules, so most mistakes show before a request. The server stays authoritative.

export type Errors = Partial<Record<'name' | 'email' | 'password' | 'passwordConfirmation' | 'base', string>>;

const EMAIL = /^[_a-zA-Z0-9+-]+(\.[_a-zA-Z0-9+-]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\.[a-zA-Z]{2,})$/;
const NICKNAME = /^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/;

export function emailError(email: string) {
  const value = email.trim();
  if (!value) return t('Email required');
  if (value.includes('⠀')) return t('Invalid email');
  if (!/^[a-zA-Z0-9]/.test(value)) return t('Should begin and end with a Latin letter or number');
  if (!EMAIL.test(value)) return t("Can't contain special symbols");
  return undefined;
}

export function nameError(name: string) {
  if (!name.trim()) return t('Nickname required');
  if (name.length < 3 || name.length > 16) return t('Should be from 3 to 16 characters');
  if (!NICKNAME.test(name)) return t('Nickname must start with a Latin letter and contain only Latin letters, digits, - and _');
  return undefined;
}

export function passwordError(password: string) {
  if (!password) return t('Password required');
  if (password.length < 8) return t('Should be at least 8 characters');
  if (password.length > 128) return t('Should be at most 128 characters');
  return undefined;
}

const clean = (errors: Errors): Errors => Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as Errors;

export const validateSignIn = (form: { email: string; password: string }) =>
  clean({ email: emailError(form.email), password: form.password ? undefined : t('Password required') });

export const validateSignUp = (form: { name: string; email: string; password: string; passwordConfirmation: string }) =>
  clean({
    name: nameError(form.name),
    email: emailError(form.email),
    password: passwordError(form.password),
    passwordConfirmation: form.password === form.passwordConfirmation ? undefined : t('Passwords must match'),
  });

export const validateReset = (form: { email: string }) => clean({ email: emailError(form.email) });

/** Server errors: `{ errors: { field: "message" } }` (422/429); EMAIL_NOT_VERIFIED gets a friendly text. */
export function serverErrors(data: Record<string, unknown>): Errors {
  const raw = (data.errors ?? {}) as Record<string, unknown>;
  const errors: Errors = {};
  (['name', 'email', 'password', 'base'] as const).forEach((key) => {
    const value = raw[key];
    const text = Array.isArray(value) ? String(value[0]) : value == null ? undefined : String(value);
    if (text) errors[key] = text;
  });
  if (errors.base === 'EMAIL_NOT_VERIFIED') {
    errors.base = t('Please verify your email before signing in. A new verification email was sent.');
  }
  if (!Object.keys(errors).length) errors.base = t('Something went wrong, please try again later');
  return errors;
}
