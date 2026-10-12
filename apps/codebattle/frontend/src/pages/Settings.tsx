import { Head } from '@inertiajs/react';
import { useScrollSpy } from '@mantine/hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountsSection } from '@/features/settings/AccountsSection';
import { ApiTokensSection } from '@/features/settings/ApiTokensSection';
import type { AccountUser, ApiToken, SettingsResponse, UserSession } from '@/features/settings/api';
import { DangerSection } from '@/features/settings/DangerSection';
import { DevicesSection } from '@/features/settings/DevicesSection';
import { PreferencesSection } from '@/features/settings/PreferencesSection';
import { ProfileSection } from '@/features/settings/ProfileSection';
import { SecuritySection } from '@/features/settings/SecuritySection';
import classes from '@/features/settings/Settings.module.css';
import { SoundSection } from '@/features/settings/SoundSection';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from UserController.edit; on /settings the shared `current_user` also
// carries the account fields and `user_sessions` lists the signed-in devices.
interface SettingsProps {
  current_user: AccountUser;
  user_sessions: UserSession[];
  api_tokens: ApiToken[];
  api_token_scopes: string[];
}

export default function Settings() {
  const { t } = useTranslation();
  const props = useSharedProps<SettingsProps>();
  const [account, setAccount] = useState<AccountUser>(props.current_user);
  const [sessions, setSessions] = useState(props.user_sessions);
  const [tokens, setTokens] = useState(props.api_tokens);

  const patch = (fields: Partial<AccountUser>) => setAccount((current) => ({ ...current, ...fields }));
  const saved = (fields: SettingsResponse) => patch(fields);

  // Section anchors (and their nav labels) come from the rendered cards.
  const spy = useScrollSpy({
    selector: '[data-settings-anchor]',
    getValue: (element) => element.dataset.label ?? '',
    getDepth: () => 1,
    offset: 90,
  });

  return (
    <AppLayout>
      <Head title={t('Settings')} />
      <PageHeader title={t('Settings')} subtitle={t('Manage your account, preferences, and active sessions.')} />

      <div className={classes.layout}>
        <nav className={classes.nav} aria-label={t('Settings')}>
          {spy.data.map((heading, index) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={classes.navLink}
              data-active={index === spy.active || undefined}
              data-danger={heading.id === 'danger' || undefined}
              onClick={(event) => {
                event.preventDefault();
                heading.getNode().scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', `#${heading.id}`);
              }}
            >
              {heading.value}
            </a>
          ))}
        </nav>

        <div className={classes.sections}>
          <ProfileSection account={account} onSaved={saved} />
          <PreferencesSection account={account} onChange={patch} onSaved={saved} />
          <SoundSection account={account} onSaved={saved} />
          <SecuritySection
            account={account}
            onPasswordChanged={() => {
              setSessions((current) => current.filter((session) => session.current));
              setTokens([]);
            }}
          />
          <AccountsSection account={account} />
          <DevicesSection
            sessions={sessions}
            onRevoked={(ids) => setSessions((current) => current.filter((session) => !ids.includes(session.id)))}
          />
          <ApiTokensSection tokens={tokens} availableScopes={props.api_token_scopes} onChange={setTokens} />
          <DangerSection />
        </div>
      </div>
    </AppLayout>
  );
}
