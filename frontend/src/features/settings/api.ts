import type { SoundSettings } from '@/shared/sound';
import type { CurrentUser } from '@/shared/types';

// /api/v1/settings/* (Api.V1.SettingsController). The page is seeded from the
// shared props, which carry the account fields on /settings.

export interface AccountUser extends CurrentUser {
  style_lang: string | null;
  db_type: string | null;
  email?: string | null;
  has_firebase_auth?: boolean;
  has_password: boolean;
  can_unlink_social: boolean;
  github_id: number | null;
  github_name: string | null;
  discord_id: number | null;
  discord_name: string | null;
  sound_settings: SoundSettings;
}

/** Fields PATCH /api/v1/settings accepts. */
export type SettingsUpdate = Partial<{
  name: string;
  clan: string;
  lang: string;
  style_lang: string;
  db_type: string;
  locale: string;
  sound_settings: Partial<SoundSettings>;
}>;

export type SettingsResponse = Pick<
  AccountUser,
  'name' | 'clan' | 'locale' | 'has_password' | 'can_unlink_social' | 'sound_settings' | 'lang' | 'style_lang' | 'db_type'
>;

export interface UserSession {
  id: string;
  current: boolean;
  user_agent: string | null;
  ip: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  inserted_at: string;
}

/** Server validation errors: field → messages. */
export type FieldErrors = Record<string, string[]>;

export class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly errors: FieldErrors,
  ) {
    super(Object.values(errors).flat().join(', ') || `Request failed with status ${status}`);
  }
}

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errors: FieldErrors = data.errors ?? (data.error ? { base: [data.error] } : {});
    throw new RequestError(response.status, errors);
  }

  return data as T;
}

/** First message per field, capitalized ("Has already been taken"). */
export function firstErrors(errors: FieldErrors): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => {
      const message = String([messages].flat()[0] ?? '');
      return [field, message.charAt(0).toUpperCase() + message.slice(1)];
    }),
  );
}

// Saves run one at a time, so quick successive changes (sliders, pickers)
// land on the server in the order they were made.
let queue: Promise<unknown> = Promise.resolve();

export function updateSettings(fields: SettingsUpdate) {
  const next = queue.catch(() => undefined).then(() => request<SettingsResponse>('PATCH', '/api/v1/settings', fields));
  queue = next;
  return next;
}

export const updatePassword = (fields: { current_password: string; password: string; password_confirmation: string }) =>
  request<{ status: 'ok' }>('PATCH', '/api/v1/settings/password', fields);

export const requestEmailChange = (fields: { email: string; current_password: string }) =>
  request<{ status: 'verification_sent' }>('PATCH', '/api/v1/settings/email', fields);

export const fetchSessions = () => request<{ sessions: UserSession[] }>('GET', '/api/v1/settings/sessions');

export const revokeSession = (id: string) =>
  request<{ status: 'ok'; current: boolean }>('DELETE', `/api/v1/settings/sessions/${id}`);

export const createApiToken = (fields: { name: string; scopes: string[]; expires_in_days: string }) =>
  request<{ api_token: ApiToken; token: string }>('POST', '/api/v1/settings/api_tokens', fields);

export const revokeApiToken = (id: string) => request<{ status: 'ok' }>('DELETE', `/api/v1/settings/api_tokens/${id}`);

/** `current_password` is required for email sign-in (Firebase) accounts, whose sign-in gets deleted too. */
export const archiveAccount = (fields: { current_password?: string } = {}) =>
  request<{ status: 'archived' }>('DELETE', '/api/v1/settings/account', fields);
