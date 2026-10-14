import { AppShell, Badge, Button, Container, Group, Menu, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconBrandDiscord,
  IconBrandGithub,
  IconBrandTelegram,
  IconChecklist,
  IconChevronDown,
  IconLogout,
  IconMessageReport,
  IconMedal,
  IconSchool,
  IconSettings,
  IconStarFilled,
  IconTrophy,
  IconUser,
  IconUsersGroup,
} from '@tabler/icons-react';
import { usePage } from '@inertiajs/react';
import { notifications } from '@mantine/notifications';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '@/assets/logo.svg?raw';
import { useInviteDialog } from '@/features/invites/dialog';
import { InvitesMenu } from '@/features/invites/InvitesMenu';
import { useInvitesChannel } from '@/features/invites/useInvitesChannel';
import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import { CreateGameModal } from '@/features/lobby/components/CreateGameModal';
import { DeployBanner } from '@/features/main/DeployBanner';
import { useMainChannel } from '@/features/main/useMainChannel';
import { type PresenceState, usePresenceStore } from '@/features/presence/store';
import { useSyncSoundMute } from '@/features/settings/useSoundMute';
import { UserAvatar } from '@/shared/UserAvatar';
import { useSharedProps } from '@/shared/useSharedProps';

import classes from './AppLayout.module.css';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { SoundToggle } from './SoundToggle';

const REPO_URL = 'https://github.com/hexlet-codebattle/codebattle';

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

/** Logo plus "Hexlet Codebattle / by Hexlet's community" (and collab logos), as in the legacy header. */
function Brand() {
  const { branding } = useSharedProps();
  const titleFirst = branding.logo_title_position === 'left';

  const title = branding.logo_title && (
    <Stack gap={0} className={classes.brandText} visibleFrom="sm">
      <Text size="sm" fw={800} c="bright" ff="heading" lh={1.2}>
        {branding.logo_title}
      </Text>
      {branding.app_subtitle && (
        <Text size="xs" c="dimmed" ff="heading" lh={1.2}>
          {branding.app_subtitle}
        </Text>
      )}
    </Stack>
  );

  return (
    <a href="/" className={classes.brand} aria-label="Codebattle">
      {titleFirst && title}
      {branding.collab_logo ? (
        <img src={branding.collab_logo} alt="" className={classes.collabLogo} />
      ) : (
        <span className={classes.logo} dangerouslySetInnerHTML={{ __html: logo }} />
      )}
      {branding.collab_logo_minor && <img src={branding.collab_logo_minor} alt="" className={classes.collabLogo} />}
      {!titleFirst && title}
    </a>
  );
}

function GithubStars() {
  const { t } = useTranslation();
  const { branding } = useSharedProps();

  return (
    <Button
      component="a"
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      radius="xl"
      size="compact-sm"
      title="Star us on GitHub"
      leftSection={<IconBrandGithub size={16} />}
      rightSection={
        <Badge variant="default" radius="sm" size="sm" leftSection={<IconStarFilled size={9} />}>
          {branding.github_stars}
        </Badge>
      }
    >
      <Text span fw={700} size="xs" visibleFrom="sm">
        {t('Star us')}
      </Text>
    </Button>
  );
}

function OnlineCount() {
  const { t } = useTranslation();
  const count = usePresenceStore((state) => state.users.length);

  return (
    <Group gap={6} wrap="nowrap" visibleFrom="md" className={classes.online}>
      <span className={classes.onlineDot} />
      <Text size="sm" c="dimmed">
        {t('%{count} Online', { count })}
      </Text>
    </Group>
  );
}

/** The signed-in user (name, avatar, menu) or Sign in / Sign up; `compact` for the game's top bar. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { current_user: user, branding } = useSharedProps();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (user.is_guest) {
    return (
      <Group gap="xs">
        <Button component="a" href="/session/new" variant="outline" color="green" size={compact ? 'compact-sm' : 'sm'}>
          {t('Sign in')}
        </Button>
        <Button component="a" href="/users/new" variant="filled" color="green" size={compact ? 'compact-sm' : 'sm'}>
          {t('Sign up')}
        </Button>
      </Group>
    );
  }

  const external = { target: '_blank', rel: 'noreferrer' } as const;

  return (
    <>
      <FeedbackModal opened={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <Menu position="bottom-end" width={230}>
        <Menu.Target>
          <UnstyledButton className={classes.userButton}>
            <Group gap="sm" wrap="nowrap">
              <Text size="sm" fw={700} c="bright" visibleFrom={compact ? 'md' : 'xs'}>
                {user.name}
              </Text>
              <UserAvatar user={user} size={compact ? 24 : 28} />
              <IconChevronDown size={14} />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {!branding.hide_user_dropdown && (
            <>
              <Menu.Item component="a" href={`/users/${user.id}`} leftSection={<IconUser size={16} />}>
                {t('My Profile')}
              </Menu.Item>
              <Menu.Item component="a" href="/settings" leftSection={<IconSettings size={16} />}>
                {t('Settings')}
              </Menu.Item>
              <Menu.Item component="a" href="/hall_of_fame" leftSection={<IconMedal size={16} />}>
                {t('Hall of Fame')}
              </Menu.Item>
              <Menu.Item component="a" href="/tournaments" leftSection={<IconTrophy size={16} />}>
                {t('Tournaments')}
              </Menu.Item>
              <Menu.Item component="a" href="/tasks" leftSection={<IconChecklist size={16} />}>
                {t('Tasks')}
              </Menu.Item>
              <Menu.Item component="a" href="/clans" leftSection={<IconUsersGroup size={16} />}>
                {t('Clans')}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item component="a" href={REPO_URL} {...external} leftSection={<IconBrandGithub size={16} />}>
                {t('SourceCode')}
              </Menu.Item>
              <Menu.Item component="a" href="https://hexlet.io" {...external} leftSection={<IconSchool size={16} />}>
                {t('Hexlet')}
              </Menu.Item>
              <Menu.Item
                component="a"
                href="https://discord.gg/dTpFXrYU3v"
                {...external}
                leftSection={<IconBrandDiscord size={16} />}
              >
                {t('Join Discord')}
              </Menu.Item>
              <Menu.Item
                component="a"
                href="https://t.me/hexletcommunity/5"
                {...external}
                leftSection={<IconBrandTelegram size={16} />}
              >
                {t('Tg#codebattle')}
              </Menu.Item>
              <Menu.Item onClick={() => setFeedbackOpen(true)} leftSection={<IconMessageReport size={16} />}>
                {t('Send feedback')}
              </Menu.Item>
              <Menu.Divider />
            </>
          )}
          <form method="post" action="/session">
            <input type="hidden" name="_method" value="delete" />
            <input type="hidden" name="_csrf_token" value={csrfToken()} />
            <Menu.Item component="button" type="submit" color="red" leftSection={<IconLogout size={16} />}>
              {t('Sign Out')}
            </Menu.Item>
          </form>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}

interface AppLayoutProps {
  children: ReactNode;
  /** What the user is doing on this page, reported to everyone's online list. */
  presence?: PresenceState;
  /** Data-heavy pages (wide tables) use more of the screen. */
  wide?: boolean;
}

/** App-wide "invite to a battle" dialog (opened from hover cards, chat, ?opponent_id=). */
function InviteDialog() {
  const { opened, opponent, close } = useInviteDialog();
  return <CreateGameModal opened={opened} onClose={close} initialOpponent={opponent} />;
}

const FLASH_COLORS: Record<string, string> = { info: 'blue', success: 'green', danger: 'red', error: 'red', warning: 'yellow' };

/** Phoenix flash (Inertia shares it as `flash`) → toasts, once per page visit. */
function FlashToasts() {
  const { flash } = usePage<{ flash?: Record<string, string> }>().props;

  useEffect(() => {
    Object.entries(flash ?? {}).forEach(([kind, message]) => {
      if (message) notifications.show({ color: FLASH_COLORS[kind] ?? 'gray', message });
    });
  }, [flash]);

  return null;
}

export function AppLayout({ children, presence = 'online', wide = false }: AppLayoutProps) {
  const { current_user: user, branding } = useSharedProps();
  useMainChannel(presence);
  useInvitesChannel(!user.is_guest);
  useSyncSoundMute();

  // Mirrors the legacy header: brand on the left; GitHub, online count, theme and the user menu on the right.
  return (
    <AppShell header={{ height: 56 }}>
      <DeployBanner />
      <FlashToasts />
      <AppShell.Header className={classes.header}>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Brand />
            <Group gap="sm" wrap="nowrap">
              {!user.is_guest && !branding.hide_invites && (
                <>
                  <GithubStars />
                  <OnlineCount />
                  <InvitesMenu />
                </>
              )}
              <SoundToggle />
              <ColorSchemeToggle />
              <UserMenu />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size={wide ? 1680 : 'xl'} py="lg">
          {children}
        </Container>
      </AppShell.Main>
      {!user.is_guest && <InviteDialog />}
    </AppShell>
  );
}
