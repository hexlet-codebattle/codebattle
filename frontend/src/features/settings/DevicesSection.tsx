import { Badge, Button, Group, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceDesktop, IconDeviceLaptop, IconDeviceMobile, IconDeviceTablet, IconLogout } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { utc } from '@/features/clans/types';
import { formatAgo } from '@/shared/formatAgo';

import { revokeSession, type UserSession } from './api';
import { Section } from './Section';
import classes from './Settings.module.css';

const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/YaBrowser\//, 'Yandex Browser'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

const match = (agent: string, table: [RegExp, string][]) => table.find(([pattern]) => pattern.test(agent))?.[1];

/** "Chrome on macOS" plus a device icon from a user agent string; raw agent otherwise. */
export function describeAgent(agent: string | null) {
  if (!agent) return { name: null, Icon: IconDeviceLaptop };

  const browser = match(agent, BROWSERS);
  const system = match(agent, SYSTEMS);
  const Icon = /iPad|Tablet/.test(agent)
    ? IconDeviceTablet
    : /Mobile|iPhone|Android/.test(agent)
      ? IconDeviceMobile
      : IconDeviceDesktop;
  const name = browser && system ? `${browser} · ${system}` : (browser ?? system ?? null);

  return { name, Icon };
}

interface DevicesSectionProps {
  sessions: UserSession[];
  onRevoked: (ids: string[]) => void;
}

export function DevicesSection({ sessions, onRevoked }: DevicesSectionProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const others = sessions.filter((session) => !session.current);

  const revoke = async (session: UserSession) => {
    setBusy(session.id);
    try {
      const result = await revokeSession(session.id);
      if (result.current) {
        window.location.assign('/session/new');
        return;
      }
      onRevoked([session.id]);
    } catch {
      notifications.show({ color: 'red', message: t('Something went wrong') });
    } finally {
      setBusy(null);
    }
  };

  const revokeOthers = async () => {
    if (!window.confirm(t('Sign out on all other devices?'))) return;
    setBusy('others');
    const results = await Promise.allSettled(others.map((session) => revokeSession(session.id)));
    onRevoked(others.filter((_, index) => results[index].status === 'fulfilled').map((session) => session.id));
    if (results.some((result) => result.status === 'rejected')) {
      notifications.show({ color: 'red', message: t('Some devices could not be signed out. Try again.') });
    }
    setBusy(null);
  };

  // The current device first, then the most recently active.
  const ordered = [...sessions].sort(
    (a, b) => Number(b.current) - Number(a.current) || utc(b.last_seen_at).localeCompare(utc(a.last_seen_at)),
  );

  return (
    <Section
      id="devices"
      label={t('Active devices')}
      icon={<IconDeviceLaptop size={18} />}
      title={t('Active devices')}
      description={t('Review and remove signed-in sessions.')}
      aside={
        others.length > 0 && (
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconLogout size={14} />}
            loading={busy === 'others'}
            onClick={revokeOthers}
          >
            {t('Sign out other devices')}
          </Button>
        )
      }
    >
      {ordered.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('No active devices')}
        </Text>
      ) : (
        <div className={classes.list}>
          {ordered.map((session) => {
            const { name, Icon } = describeAgent(session.user_agent);
            const lastSeen = formatAgo(utc(session.last_seen_at), { recentSeconds: 300 });

            return (
              <div key={session.id} className={classes.row} data-current={session.current || undefined}>
                <span className={classes.rowIcon}>
                  <Icon size={18} />
                </span>
                <div className={classes.rowBody}>
                  <Group gap={6} wrap="nowrap">
                    <Tooltip label={session.user_agent ?? t('Unknown device')} multiline maw={360} openDelay={400}>
                      <Text size="sm" fw={600} c="bright" truncate>
                        {name ?? session.user_agent ?? t('Unknown device')}
                      </Text>
                    </Tooltip>
                    {session.current && (
                      <Badge size="xs" variant="light" color="green">
                        {t('Current device')}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" truncate>
                    {[
                      session.ip,
                      session.current
                        ? t('Active now')
                        : lastSeen
                          ? t('Active %{ago}', { ago: lastSeen })
                          : t('Active recently'),
                      t('signed in %{date}', { date: new Date(utc(session.created_at)).toLocaleDateString() }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="subtle"
                  color={session.current ? 'gray' : 'red'}
                  loading={busy === session.id}
                  disabled={busy === 'others'}
                  onClick={() => revoke(session)}
                  aria-label={t('Remove device %{device}', { device: name ?? session.id })}
                >
                  {session.current ? t('Sign out') : t('Remove')}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
