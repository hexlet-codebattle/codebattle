import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Code,
  CopyButton,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBook, IconCheck, IconCopy, IconKey, IconTrash } from '@tabler/icons-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatAgo } from '@/shared/formatAgo';

import { type ApiToken, createApiToken, RequestError, revokeApiToken } from './api';
import { Section } from './Section';
import classes from './Settings.module.css';

const SCOPES = [
  { scope: 'read', description: 'Your profile, games, tournaments and the schedule' },
  { scope: 'games:write', description: 'Create and cancel your games' },
  { scope: 'tournaments:write', description: 'Create, edit, start and cancel private tournaments' },
];

const EXPIRY = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'Never (read-only tokens)' },
];

interface ApiTokensSectionProps {
  tokens: ApiToken[];
  /** Scopes this account may grant (write scopes need an account older than a week). */
  availableScopes: string[];
  onChange: (tokens: ApiToken[]) => void;
}

export function ApiTokensSection({ tokens, availableScopes, onChange }: ApiTokensSectionProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [expiresIn, setExpiresIn] = useState('90');
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const readOnly = scopes.every((scope) => scope === 'read');

  const toggleScopes = (next: string[]) => {
    setScopes(next);
    // Tokens that can write must expire.
    if (expiresIn === 'never' && next.some((scope) => scope !== 'read')) setExpiresIn('90');
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const data = await createApiToken({ name: name.trim(), scopes, expires_in_days: expiresIn });
      onChange([data.api_token, ...tokens]);
      setCreated({ name: data.api_token.name, token: data.token });
      setName('');
    } catch (failure) {
      setError(failure instanceof RequestError ? failure.message : t('Something went wrong'));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (token: ApiToken) => {
    if (!window.confirm(t('Revoke token "%{name}"? Apps using it stop working.', { name: token.name }))) return;
    try {
      await revokeApiToken(token.id);
      onChange(tokens.filter((current) => current.id !== token.id));
    } catch {
      notifications.show({ color: 'red', message: t('Something went wrong') });
    }
  };

  return (
    <Section
      id="api-tokens"
      label={t('API tokens')}
      icon={<IconKey size={18} />}
      title={t('API tokens')}
      description={t('Personal tokens for bots, CLI and devices.')}
      aside={
        <Button
          component="a"
          href="/public_api/docs"
          target="_blank"
          rel="noreferrer"
          size="xs"
          variant="subtle"
          leftSection={<IconBook size={14} />}
        >
          {t('API documentation')}
        </Button>
      }
    >
      <Stack gap="lg">
        {created && (
          <Alert color="green" icon={<IconKey size={16} />} title={t('Token "%{name}" created', { name: created.name })}>
            <Stack gap="xs">
              <Text size="sm">{t('Copy the token now, it will not be shown again:')}</Text>
              <Group gap="xs" wrap="nowrap" align="center">
                <Code block className={classes.newToken} style={{ flex: 1 }}>
                  {created.token}
                </Code>
                <CopyButton value={created.token}>
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant={copied ? 'light' : 'default'}
                      color={copied ? 'green' : undefined}
                      leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      onClick={copy}
                    >
                      {copied ? t('Copied') : t('Copy')}
                    </Button>
                  )}
                </CopyButton>
              </Group>
              <Group justify="flex-end">
                <Button size="compact-sm" variant="subtle" onClick={() => setCreated(null)}>
                  {t('Done')}
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}

        <form onSubmit={create}>
          <Stack gap="sm">
            <Text className={classes.subhead}>{t('New token')}</Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label={t('Token name')}
                placeholder={t('e.g. Gauntlet or my bot')}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                maxLength={64}
                required
              />
              <Select
                label={t('Expires in')}
                allowDeselect={false}
                value={expiresIn}
                onChange={(value) => value && setExpiresIn(value)}
                data={EXPIRY.map(({ value, label }) => ({
                  value,
                  label: t(label),
                  disabled: value === 'never' && !readOnly,
                }))}
              />
            </SimpleGrid>
            <Checkbox.Group value={scopes} onChange={toggleScopes} label={t('Scopes')}>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" mt={4}>
                {SCOPES.map(({ scope, description }) => {
                  const allowed = availableScopes.includes(scope);
                  const card = (
                    <Checkbox.Card value={scope} disabled={!allowed} radius="md" p="sm" style={{ height: '100%' }}>
                      <Group gap="sm" wrap="nowrap" align="flex-start">
                        <Checkbox.Indicator disabled={!allowed} />
                        <div>
                          <Text size="sm" ff="monospace" fw={600}>
                            {scope}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {t(description)}
                          </Text>
                        </div>
                      </Group>
                    </Checkbox.Card>
                  );

                  return allowed ? (
                    <div key={scope}>{card}</div>
                  ) : (
                    <Tooltip key={scope} label={t('Available for accounts older than a week')}>
                      <div style={{ opacity: 0.55 }}>{card}</div>
                    </Tooltip>
                  );
                })}
              </SimpleGrid>
            </Checkbox.Group>
            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}
            <Group justify="flex-end">
              <Button
                type="submit"
                variant="filled"
                leftSection={<IconKey size={14} />}
                loading={creating}
                disabled={!name.trim() || scopes.length === 0}
              >
                {t('Create token')}
              </Button>
            </Group>
          </Stack>
        </form>

        <Stack gap="xs">
          <Text className={classes.subhead}>{t('Your tokens')}</Text>
          {tokens.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('No API tokens')}
            </Text>
          ) : (
            <div className={classes.list}>
              {tokens.map((token) => (
                <div key={token.id} className={classes.row}>
                  <span className={classes.rowIcon}>
                    <IconKey size={16} />
                  </span>
                  <div className={classes.rowBody}>
                    <Group gap={8} wrap="nowrap">
                      <Text size="sm" fw={600} c="bright" truncate>
                        {token.name}
                      </Text>
                      <Code fz="xs">{`${token.token_prefix}…`}</Code>
                    </Group>
                    <Group gap={4} mt={4}>
                      {token.scopes.map((scope) => (
                        <Badge key={scope} size="xs" variant="light" color="gray" tt="none" ff="monospace">
                          {scope}
                        </Badge>
                      ))}
                      <Text size="xs" c="dimmed" ml={4}>
                        {[
                          token.last_used_at
                            ? t('Last used %{ago}', { ago: formatAgo(token.last_used_at) })
                            : t('Never used'),
                          token.expires_at
                            ? t('Expires %{date}', { date: new Date(token.expires_at).toLocaleDateString() })
                            : t('Never expires'),
                        ].join(' · ')}
                      </Text>
                    </Group>
                  </div>
                  <Tooltip label={t('Revoke')}>
                    <ActionIcon variant="subtle" color="red" onClick={() => revoke(token)} aria-label={t('Revoke')}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </Stack>
      </Stack>
    </Section>
  );
}
