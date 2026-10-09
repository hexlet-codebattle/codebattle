import React, { useCallback, useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { camelizeKeys } from 'humps';

import i18n from '../../../i18n';

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
}

const csrfToken = () =>
  document?.querySelector("meta[name='csrf-token']")?.getAttribute('content') ?? '';

const request = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken(),
    },
  });
  const data = camelizeKeys(await response.json()) as any;

  if (!response.ok) {
    const errors = data.errors ? Object.values(data.errors).flat().join(', ') : data.error;
    throw new Error(errors || `Request failed with status ${response.status}`);
  }

  return data;
};

const expiryOptions = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'Never (read-only tokens)' },
];

const scopeOptions = [
  {
    scope: 'read',
    description: 'Your profile, games, tournaments and the schedule',
  },
  { scope: 'games:write', description: 'Create and cancel your games' },
  {
    scope: 'tournaments:write',
    description: 'Create, edit, start and cancel private tournaments',
  },
];

function ApiTokensSection() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [expiresIn, setExpiresIn] = useState('90');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    request('/api/v1/settings/api_tokens')
      .then((data) => {
        setTokens(data.apiTokens);
        setAvailableScopes(data.scopes);
      })
      .catch((e) => setError(e.message));
  }, []);

  const toggleScope = useCallback((scope: string) => {
    setScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope],
    );
  }, []);

  const handleCreate = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);

      try {
        const data = await request('/api/v1/settings/api_tokens', {
          method: 'POST',
          body: JSON.stringify({ name, scopes, expires_in_days: expiresIn }),
        });
        setTokens((current) => [data.apiToken, ...current]);
        setCreatedToken(data.token);
        setName('');
      } catch (e: any) {
        setError(e.message);
      }
    },
    [name, scopes, expiresIn],
  );

  const handleRevoke = useCallback(async (token: ApiToken) => {
    try {
      await request(`/api/v1/settings/api_tokens/${token.id}`, {
        method: 'DELETE',
      });
      setTokens((current) => current.filter((t) => t.id !== token.id));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  return (
    <section
      className="cb-settings-section cb-api-tokens"
      aria-labelledby="api-tokens-settings-title"
    >
      <div className="cb-settings-section-heading">
        <span className="cb-settings-section-icon" aria-hidden="true">
          <FontAwesomeIcon icon="key" />
        </span>
        <div>
          <h3 id="api-tokens-settings-title">{i18n.t('API tokens')}</h3>
          <p>
            {i18n.t('Personal tokens for bots, CLI and devices.')}{' '}
            <a href="/public_api/docs" target="_blank" rel="noreferrer">
              {i18n.t('API documentation')}
            </a>
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {createdToken && (
        <div className="cb-api-token-created">
          <div className="mb-2">{i18n.t('Copy the token now, it will not be shown again:')}</div>
          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            <code>{createdToken}</code>
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              onClick={() => navigator.clipboard?.writeText(createdToken)}
            >
              {i18n.t('Copy')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setCreatedToken(null)}
            >
              {i18n.t('Done')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate}>
        <div className="cb-api-token-form">
          <div>
            <label htmlFor="api-token-name">{i18n.t('Token name')}</label>
            <input
              id="api-token-name"
              className="form-control cb-bg-panel cb-border-color text-white"
              placeholder={i18n.t('e.g. Gauntlet or my bot')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
            />
          </div>
          <div>
            <label htmlFor="api-token-expiry">{i18n.t('Expires in')}</label>
            <select
              id="api-token-expiry"
              className="form-control cb-bg-panel cb-border-color text-white"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              {expiryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {i18n.t(option.label)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-success" disabled={scopes.length === 0}>
            {i18n.t('Create token')}
          </button>
        </div>

        <div className="cb-api-token-scopes">
          {scopeOptions.map(({ scope, description }) => {
            const allowed = availableScopes.includes(scope);
            const checked = scopes.includes(scope);

            return (
              <label
                key={scope}
                aria-label={scope}
                className={cn('cb-api-token-scope', {
                  'is-active': checked,
                  'is-disabled': !allowed,
                })}
                title={allowed ? undefined : i18n.t('Available for accounts older than a week')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!allowed}
                  onChange={() => toggleScope(scope)}
                />
                <span>
                  <code>{scope}</code>
                  <small>{i18n.t(description)}</small>
                </span>
              </label>
            );
          })}
        </div>
      </form>

      {tokens.length === 0 ? (
        <div className="text-muted">{i18n.t('No API tokens')}</div>
      ) : (
        <div className="d-flex flex-column">
          {tokens.map((token) => (
            <div key={token.id} className="cb-settings-device">
              <div className="mr-3 text-break">
                <div className="mb-1">
                  <span className="font-weight-bold mr-2">{token.name}</span>
                  <code>{`${token.tokenPrefix}…`}</code>
                </div>
                <div className="mb-1">
                  {token.scopes.map((scope) => (
                    <span key={scope} className="cb-api-token-badge">
                      {scope}
                    </span>
                  ))}
                </div>
                <small className="text-muted">
                  {[
                    token.lastUsedAt
                      ? `${i18n.t('Last used')} ${new Date(token.lastUsedAt).toLocaleString()}`
                      : i18n.t('Never used'),
                    token.expiresAt
                      ? `${i18n.t('Expires')} ${new Date(token.expiresAt).toLocaleDateString()}`
                      : i18n.t('Never expires'),
                  ].join(' · ')}
                </small>
              </div>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => handleRevoke(token)}
              >
                {i18n.t('Revoke')}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ApiTokensSection;
