import React, { useState, useCallback, useEffect } from 'react';

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
  type UserSettingsData,
  type UserSettingsFormValues,
} from './UserSettingsForm';

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
const notifications: Record<'success' | 'error' | 'empty', Notification> = {
  success: { variant: 'success', message: i18n.t('Settings changed successfully') },
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

const updatePassword = async (values: Record<string, unknown>) => {
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

  const handleUpdateUserSettings = useCallback(
    async (
      values: UserSettingsFormValues,
      { setErrors, resetForm }: FormikHelpers<UserSettingsFormValues>,
    ) => {
      const { currentPassword, password, passwordConfirmation, ...settingsValues } = values;
      const passwordValues = { currentPassword, password, passwordConfirmation };

      try {
        const data = await updateSettings(settingsValues as unknown as Record<string, unknown>);

        await i18n.changeLanguage(getSupportedLocale(data.locale));
        const updatedSettings = camelizeKeys(data) as { name?: string };
        dispatch(actions.updateUserSettings(updatedSettings));
        configureSound(settingsValues.soundSettings);

        // The navbar user name is server-rendered from @current_user, so reflect
        // the new name there without requiring a full page reload.
        if (updatedSettings.name) {
          const headerNameEl = document.getElementById('navbar-current-user-name');
          if (headerNameEl) {
            headerNameEl.textContent = updatedSettings.name;
          }
        }

        if (Object.values(passwordValues).some((value) => value.trim())) {
          await updatePassword(passwordValues);
        }

        resetForm({
          values: {
            ...settingsValues,
            currentPassword: '',
            password: '',
            passwordConfirmation: '',
          },
        });
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

  return (
    <div className="container cb-bg-panel cb-text cb-rounded shadow-sm py-4">
      <Notification notification={notification} onClose={setNotification} />
      <h2 className="font-weight-normal">{i18n.t('Settings')}</h2>
      <UserSettingsForm settings={settings} onSubmit={handleUpdateUserSettings} />
      <div className="mt-3 ml-2 d-flex flex-column">
        <h3 className="mb-3 font-weight-normal">{i18n.t('Socials')}</h3>
        <SocialButtons settings={settings} />
      </div>
      <div className="mt-4 ml-2">
        <h3 className="mb-3 font-weight-normal">{i18n.t('Active devices')}</h3>
        {sessions.length === 0 ? (
          <div className="text-muted">{i18n.t('No active devices')}</div>
        ) : (
          <div className="d-flex flex-column">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="d-flex flex-wrap justify-content-between align-items-center cb-border-color border rounded p-3 mb-2"
              >
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
                  className="btn btn-outline-danger btn-sm mt-2 mt-md-0"
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
      </div>
    </div>
  );
}

export default UserSettings;
