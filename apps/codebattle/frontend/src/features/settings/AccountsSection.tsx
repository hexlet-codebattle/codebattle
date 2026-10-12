import { Badge, Button, Text, Tooltip } from '@mantine/core';
import { IconBrandDiscord, IconBrandGithub, IconLink } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { MethodButton } from '@/shared/MethodButton';

import type { AccountUser } from './api';
import { Section } from './Section';
import classes from './Settings.module.css';

const PROVIDERS: { id: 'github' | 'discord'; name: string; icon: ReactNode }[] = [
  { id: 'github', name: 'GitHub', icon: <IconBrandGithub size={18} /> },
  { id: 'discord', name: 'Discord', icon: <IconBrandDiscord size={18} /> },
];

/** GitHub / Discord sign-in links (AuthBindController: GET bind, DELETE unbind). */
export function AccountsSection({ account }: { account: AccountUser }) {
  const { t } = useTranslation();

  return (
    <Section
      id="accounts"
      label={t('Connected accounts')}
      icon={<IconLink size={18} />}
      title={t('Connected accounts')}
      description={t('Manage the services you use to sign in.')}
    >
      <div className={classes.list}>
        {PROVIDERS.map(({ id, name, icon }) => {
          const linked = account[`${id}_id`] != null;
          const handle = account[`${id}_name`];

          return (
            <div key={id} className={classes.row}>
              <span className={classes.rowIcon}>{icon}</span>
              <div className={classes.rowBody}>
                <Text size="sm" fw={600} c="bright">
                  {name}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {linked ? (handle ? `@${handle}` : t('Connected')) : t('Not connected')}
                </Text>
              </div>
              {linked && (
                <Badge size="sm" variant="light" color="green">
                  {t('Connected')}
                </Badge>
              )}
              {linked ? (
                account.can_unlink_social ? (
                  <MethodButton
                    action={`/auth/${id}`}
                    method="delete"
                    size="xs"
                    variant="subtle"
                    color="red"
                    confirm={t('Unlink %{provider}?', { provider: name })}
                  >
                    {t('Unlink')}
                  </MethodButton>
                ) : (
                  <Tooltip label={t('This is your only way to sign in. Set a password or link another account first.')} multiline w={260}>
                    <Button size="xs" variant="subtle" color="red" data-disabled onClick={(event) => event.preventDefault()}>
                      {t('Unlink')}
                    </Button>
                  </Tooltip>
                )
              ) : (
                <Button component="a" href={`/auth/${id}/bind/`} size="xs" variant="default" leftSection={icon}>
                  {t('Link %{provider}', { provider: name })}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
