import React, { useState, useCallback, useEffect, useRef } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { camelizeKeys, decamelizeKeys } from 'humps';
import capitalize from 'lodash/capitalize';
import noop from 'lodash/noop';
import Alert from 'react-bootstrap/Alert';
import { useDispatch, useSelector } from 'react-redux';
import type { FormikHelpers } from 'formik';

import type { RootState } from '@/slices/store';
import { getPageProp } from '@/inertia/pageProps';

import i18n, { getSupportedLocale } from '../../../i18n';
import { configureSound } from '../../lib/sound';
import { userSettingsSelector } from '../../selectors';
import { actions } from '../../slices';

import UserSettingsForm, {
  type PasswordSettingsFormValues,
  type UserPreferenceUpdate,
  type UserSettingsData,
  type UserSettingsFormValues,
} from './UserSettingsForm';
import EmailSettingsForm, { type EmailSettingsFormValues } from './EmailSettingsForm';

interface Notification {
  variant?: string;
  message?: string;
}

interface UpdateSettingsError extends Error {
  response?: { data: { errors: Record<string, string[]> }; status: number };
}

interface UserSessionData {
  id: string;
  current: boolean;
  userAgent?: string | null;
  ip?: string | null;
  lastSeenAt: string;
  createdAt: string;
}

const providers = ['github', 'discord'] as const;
const mapUserPropNameByProviderName: Record<(typeof providers)[number], keyof UserSettingsData> = {
  github: 'githubId',
  discord: 'discordId',
};
const notifications: Record<'success' | 'emailVerification' | 'error' | 'empty', Notification> = {
  success: {
    variant: 'success',
    message: i18n.t('Settings changed successfully'),
  },
  emailVerification: {
    variant: 'success',
    message: i18n.t('Verification email sent. Confirm the new address to finish the change.'),
  },
  error: { variant: 'danger', message: i18n.t('Something went wrong') },
  empty: {},
};

const csrfToken = document?.querySelector("meta[name='csrf-token']")?.getAttribute('content');
const updateSettings = async (values: Record<string, unknown>) => {
  const response = await fetch('/api/v1/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(decamelizeKeys(values)),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as UpdateSettingsError;
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
};

const updatePassword = async (values: PasswordSettingsFormValues) => {
  const response = await fetch('/api/v1/settings/password', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(decamelizeKeys(values)),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as UpdateSettingsError;
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
};

const requestEmailChange = async (values: EmailSettingsFormValues) => {
  const response = await fetch('/api/v1/settings/email', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(decamelizeKeys(values)),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as UpdateSettingsError;
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
};

const deleteUserSession = async (sessionId: string) => {
  const response = await fetch(`/api/v1/settings/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'x-csrf-token': csrfToken ?? '',
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return data as { current: boolean };
};

const formatFieldErrors = (errors: Record<string, string[]> = {}) =>
  Object.entries(camelizeKeys(errors)).reduce<Record<string, string>>(
    (result, [fieldName, messages]) => {
      const fieldMessages = Array.isArray(messages) ? messages : [String(messages)];

      return {
        ...result,
        [fieldName]: fieldMessages.map(capitalize).join(', '),
      };
    },
    {},
  );

interface NotificationProps {
  notification: Notification;
  onClose: (notification: Notification) => void;
}

function Notification({ notification, onClose }: NotificationProps) {
  const { variant, message } = notification;

  useEffect(() => {
    if (!message) return noop;

    const timerId = setTimeout(() => onClose(notifications.empty), 1600);

    return () => clearTimeout(timerId);
  }, [onClose, message]);

  return (
    <Alert show={!!message} variant={variant} className="alert-dark-theme rounded shadow-sm mb-2">
      {message}
    </Alert>
  );
}

interface SocialButtonsProps {
  settings: UserSettingsData;
}

function SocialButtons({ settings }: SocialButtonsProps) {
  return providers.map((provider) => {
    const providerPropName = mapUserPropNameByProviderName[provider];
    const isLinked = !!settings[providerPropName];
    const formatedProviderName = capitalize(provider);

    return (
      <div key={provider} className="d-flex mb-2 align-items-center">
        <FontAwesomeIcon
          className={cn('mr-2', { 'text-muted': isLinked })}
          icon={['fab', provider]}
        />
        {isLinked ? (
          <button
            type="button"
            className="bind-social"
            data-method="delete"
            data-csrf={csrfToken}
            data-to={`/auth/${provider}`}
            disabled={!settings.canUnlinkSocial}
          >
            {i18n.t('Unlink %{provider}', { provider: formatedProviderName })}
          </button>
        ) : (
          <a className="bind-social" href={`/auth/${provider}/bind/`}>
            {i18n.t('Link %{provider}', { provider: formatedProviderName })}
          </a>
        )}
      </div>
    );
  });
}

function UserSettings() {
  const [notification, setNotification] = useState<Notification>(notifications.empty);
  const [sessions, setSessions] = useState<UserSessionData[]>(() =>
    camelizeKeys(getPageProp<UserSessionData[]>('user_sessions', [])),
  );
  const [revokingSessionId, setRevokingSessionId] = useState<string>();
  const settings = useSelector((state: RootState) =>
    userSettingsSelector(state),
  ) as UserSettingsData;
  const dispatch = useDispatch();
  const settingsSaveQueue = useRef<Promise<unknown>>(Promise.resolve());

  const handleDeleteSession = useCallback(async (session: UserSessionData) => {
    setRevokingSessionId(session.id);

    try {
      const result = await deleteUserSession(session.id);

      if (result.current) {
        window.location.assign('/session/new');
        return;
      }

      setSessions((currentSessions) =>
        currentSessions.filter((currentSession) => currentSession.id !== session.id),
      );
      setNotification(notifications.success);
    } catch {
      setNotification(notifications.error);
    } finally {
      setRevokingSessionId(undefined);
    }
  }, []);

  const applySettingsUpdate = useCallback(
    async (values: Record<string, unknown>) => {
      const request = settingsSaveQueue.current.catch(noop).then(() => updateSettings(values));
      settingsSaveQueue.current = request;

      const data = await request;
      const updatedSettings = camelizeKeys(data) as Partial<UserSettingsData>;

      dispatch(actions.updateUserSettings(updatedSettings));

      if (updatedSettings.soundSettings) {
        configureSound(updatedSettings.soundSettings);
      }

      if (values.locale) {
        await i18n.changeLanguage(
          getSupportedLocale(updatedSettings.locale || String(values.locale)),
        );
      }

      if (values.name && updatedSettings.name) {
        const headerNameEl = document.getElementById('navbar-current-user-name');
        if (headerNameEl) {
          headerNameEl.textContent = updatedSettings.name;
        }
      }

      return updatedSettings;
    },
    [dispatch],
  );

  const handleUpdateUserSettings = useCallback(
    async (
      values: UserSettingsFormValues,
      { setErrors }: FormikHelpers<UserSettingsFormValues>,
    ) => {
      try {
        await applySettingsUpdate({ name: values.name, clan: values.clan });
        setNotification(notifications.success);
      } catch (rawError) {
        const error = rawError as UpdateSettingsError;
        if (!error.response) {
          setNotification(notifications.error);
          return;
        }

        setErrors(formatFieldErrors(error.response.data.errors));
      }
    },
    [applySettingsUpdate],
  );

  const handleAutoSave = useCallback(
    async (values: UserPreferenceUpdate) => {
      try {
        await applySettingsUpdate(values as Record<string, unknown>);
      } catch {
        setNotification(notifications.error);
      }
    },
    [applySettingsUpdate],
  );

  const handlePasswordSubmit = useCallback(
    async (
      values: PasswordSettingsFormValues,
      { resetForm, setErrors }: FormikHelpers<PasswordSettingsFormValues>,
    ) => {
      try {
        const data = await updatePassword(values);
        dispatch(actions.updateUserSettings(camelizeKeys(data)));
        resetForm();
        setNotification(notifications.success);
      } catch (rawError) {
        const error = rawError as UpdateSettingsError;
        if (!error.response) {
          setNotification(notifications.error);
          return;
        }

        setErrors(formatFieldErrors(error.response.data.errors));
      }
    },
    [dispatch],
  );

  const handleEmailChange = useCallback(
    async (
      values: EmailSettingsFormValues,
      { resetForm, setErrors }: FormikHelpers<EmailSettingsFormValues>,
    ) => {
      try {
        await requestEmailChange(values);
        resetForm();
        setNotification(notifications.emailVerification);
      } catch (rawError) {
        const error = rawError as UpdateSettingsError;
        if (!error.response) {
          setNotification(notifications.error);
          return;
        }

        const errors = formatFieldErrors(error.response.data.errors);
        if (errors.base) {
          setNotification({ variant: 'danger', message: errors.base });
        }
        setErrors({
          email: errors.email,
          currentPassword: errors.currentPassword,
        });
      }
    },
    [],
  );

  return (
    <div className="container cb-settings-page cb-text py-4 px-3 px-md-4">
      <Notification notification={notification} onClose={setNotification} />
      <header className="cb-settings-page-header">
        <h2>{i18n.t('Settings')}</h2>
        <p>{i18n.t('Manage your account, preferences, and active sessions.')}</p>
      </header>
      <UserSettingsForm
        settings={settings}
        onSubmit={handleUpdateUserSettings}
        onAutoSave={handleAutoSave}
        onPasswordSubmit={handlePasswordSubmit}
      />
      {settings.hasFirebaseAuth && settings.email && (
        <EmailSettingsForm currentEmail={settings.email} onSubmit={handleEmailChange} />
      )}
      <div className="cb-settings-account-grid">
        <section className="cb-settings-section mb-0" aria-labelledby="social-settings-title">
          <div className="cb-settings-section-heading">
            <span className="cb-settings-section-icon" aria-hidden="true">
              <FontAwesomeIcon icon="link" />
            </span>
            <div>
              <h3 id="social-settings-title">{i18n.t('Connected accounts')}</h3>
              <p>{i18n.t('Manage the services you use to sign in.')}</p>
            </div>
          </div>
          <div className="cb-settings-social-links">
            <SocialButtons settings={settings} />
          </div>
        </section>

        <section className="cb-settings-section mb-0" aria-labelledby="sessions-settings-title">
          <div className="cb-settings-section-heading">
            <span className="cb-settings-section-icon" aria-hidden="true">
              <FontAwesomeIcon icon="laptop-code" />
            </span>
            <div>
              <h3 id="sessions-settings-title">{i18n.t('Active devices')}</h3>
              <p>{i18n.t('Review and remove signed-in sessions.')}</p>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div className="text-muted">{i18n.t('No active devices')}</div>
          ) : (
            <div className="d-flex flex-column">
              {sessions.map((session) => (
                <div key={session.id} className="cb-settings-device">
                  <div className="mr-3 text-break">
                    <div>
                      {session.userAgent || i18n.t('Unknown device')}
                      {session.current && (
                        <span className="badge badge-success ml-2">{i18n.t('Current device')}</span>
                      )}
                    </div>
                    <small className="text-muted">
                      {[session.ip, new Date(session.lastSeenAt).toLocaleString()]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    disabled={revokingSessionId === session.id}
                    onClick={() => handleDeleteSession(session)}
                    aria-label={i18n.t('Remove device %{device}', {
                      device: session.userAgent || session.id,
                    })}
                  >
                    {session.current ? i18n.t('Sign out') : i18n.t('Remove')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default UserSettings;
