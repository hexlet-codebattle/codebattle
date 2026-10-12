import { ActionIcon, Anchor, Badge, Button, Group, Popover, SimpleGrid, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconBan,
  IconBinoculars,
  IconBinocularsFilled,
  IconCopy,
  IconEye,
  IconMessage,
  IconSwords,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useInviteDialog } from '@/features/invites/dialog';
import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { followUser, unfollowUser } from '@/features/main/useMainChannel';
import { useFollowStore } from '@/features/main/store';
import { usePresenceStore } from '@/features/presence/store';
import { formatAgo } from '@/shared/formatAgo';
import { UserAvatar } from '@/shared/UserAvatar';
import { useSharedProps } from '@/shared/useSharedProps';
import { LangIcon } from '@/shared/LangIcon';

import { AchievementTile, GRADE_WINS, PRESENCE_LABELS, visibleAchievements } from './achievements';
import { fetchUserCard } from './api';
import classes from './UserCard.module.css';

export interface CardUser {
  id: number;
  name: string;
  avatar_url?: string | null;
  is_bot?: boolean;
  is_guest?: boolean;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={0} align="center">
      <Text ff="monospace" fw={700} c="bright" lh={1.3}>
        {value}
      </Text>
      <Text fz={11} c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

interface CardActions {
  /** Chat only: open a private room with this user. */
  onDirectMessage?: (user: CardUser) => void;
  /** Chat only (admins): ban from this chat. */
  onBan?: (user: CardUser) => void;
}

function CardContent({ user, onDirectMessage, onBan }: { user: CardUser } & CardActions) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const clipboard = useClipboard();
  const presence = usePresenceStore((state) => state.users.find(({ id }) => id === user.id));
  const followId = useFollowStore((state) => state.followId);
  const openInvite = useInviteDialog((state) => state.open);
  const { data, isPending, isError } = useQuery({
    queryKey: ['user-card', user.id],
    queryFn: () => fetchUserCard(user.id),
    staleTime: 5 * 60_000,
  });

  const self = user.id === me.id;
  // Online: what they're doing. Offline: when they were last around, if known.
  // Sessions record activity at most every 5 minutes, so anything newer is "recently".
  const lastActive = data?.last_active_at;
  const ago = lastActive ? formatAgo(lastActive, { recentSeconds: 5 * 60 }) : undefined;
  const status = presence
    ? t(PRESENCE_LABELS[presence.state] ?? 'Online')
    : lastActive
      ? ago
        ? t('Seen %{when}', { when: ago })
        : t('Seen recently')
      : t('Offline');
  const following = followId === user.id;
  const profile = data?.user;
  const activeGameId = data?.active_game_id ?? null;
  const stats = data?.metrics.game_stats;
  const tournaments = data?.metrics.tournaments_stats;
  const achievements = visibleAchievements(data?.achievements);

  return (
    <Stack gap="sm">
      {/* Avatar spans both rows; name + actions on top, status/clan across the full width below. */}
      <div className={classes.header}>
        <UserAvatar
          user={{ id: user.id, avatar_url: profile?.avatar_url ?? user.avatar_url }}
          size={44}
          className={classes.avatar}
        />
        <Group gap={6} wrap="nowrap" miw={0} className={classes.name}>
          <LangIcon lang={profile?.lang} size={18} />
          <Anchor href={`/users/${user.id}`} fw={700} c="bright" truncate>
            {user.name}
          </Anchor>
        </Group>
        <Group gap={6} wrap="nowrap" miw={0} className={classes.status}>
          <span className={classes.dot} data-online={presence ? true : undefined} />
          <Text size="xs" c="dimmed" truncate>
            {[status, profile?.clan].filter(Boolean).join(' · ')}
          </Text>
        </Group>

        <Group gap={2} wrap="nowrap" className={classes.actions}>
          <Tooltip label={activeGameId ? t('Watch the game') : t('Not in a game')}>
            <ActionIcon
              size={26}
              variant="subtle"
              component="a"
              href={activeGameId ? `/games/${activeGameId}` : undefined}
              data-disabled={!activeGameId || undefined}
              disabled={!activeGameId}
              aria-label={t('Watch the game')}
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
          {!self && (
            <Tooltip label={following ? t('Unfollow') : t('Follow: open their games automatically')}>
              <ActionIcon
                size={26}
                variant={following ? 'light' : 'subtle'}
                onClick={() => (following ? unfollowUser() : void followUser({ id: user.id, name: user.name }))}
                aria-label={following ? t('Unfollow') : t('Follow')}
              >
                {following ? <IconBinocularsFilled size={16} /> : <IconBinoculars size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
          {!self && onDirectMessage && (
            <Tooltip label={t('Send private message')}>
              <ActionIcon size={26} variant="subtle" onClick={() => onDirectMessage(user)} aria-label={t('Send private message')}>
                <IconMessage size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={t('Copy name')}>
            <ActionIcon size={26} variant="subtle" onClick={() => clipboard.copy(user.name)} aria-label={t('Copy name')}>
              <IconCopy size={15} />
            </ActionIcon>
          </Tooltip>
          {!self && me.is_admin && onBan && (
            <Tooltip label={t('Ban in chat')}>
              <ActionIcon size={26} color="red" variant="subtle" onClick={() => onBan(user)} aria-label={t('Ban in chat')}>
                <IconBan size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </div>

      {!self && (
        <Button
          fullWidth
          size="compact-sm"
          variant="filled"
          color="green"
          leftSection={<IconSwords size={14} />}
          onClick={() => openInvite({ id: user.id, name: user.name })}
        >
          {t('Invite to battle')}
        </Button>
      )}

      <SimpleGrid cols={3} spacing={0} className={classes.stats}>
        <Stat label={t('Place')} value={profile ? (profile.points ? `#${profile.rank}` : '—') : '…'} />
        <Stat label={t('Points')} value={profile?.points ?? '…'} />
        <Stat label={t('Elo')} value={profile?.rating ?? '…'} />
      </SimpleGrid>

      {isError ? (
        <Text size="xs" c="dimmed" ta="center">
          {t("Couldn't load this player's stats.")}
        </Text>
      ) : isPending ? (
        <Stack gap={6}>
          <Skeleton h={22} />
          <Skeleton h={56} />
        </Stack>
      ) : (
        <>
          <Group justify="space-between" wrap="nowrap" gap={4}>
            {GRADE_WINS.map(({ grade, key }) => (
              <Tooltip key={grade} label={t('Tournament wins')}>
                <Group gap={2} wrap="nowrap" className={classes.gradeWins} data-zero={!tournaments?.[key] || undefined}>
                  <GradeIcon grade={grade} size={18} />
                  <Text size="xs" ff="monospace" fw={700}>
                    {tournaments?.[key] ?? 0}
                  </Text>
                </Group>
              </Tooltip>
            ))}
          </Group>

          {stats && (
            <Group justify="center" gap="md">
              <Text size="xs">
                <Text span c="dimmed">
                  {t('Won')}{' '}
                </Text>
                <Text span ff="monospace" fw={700} className={classes.won}>
                  {stats.won}
                </Text>
              </Text>
              <Text size="xs">
                <Text span c="dimmed">
                  {t('Lost')}{' '}
                </Text>
                <Text span ff="monospace" fw={700} className={classes.lost}>
                  {stats.lost}
                </Text>
              </Text>
              <Text size="xs">
                <Text span c="dimmed">
                  {t('Gave up')}{' '}
                </Text>
                <Text span ff="monospace" fw={700}>
                  {stats.gave_up}
                </Text>
              </Text>
            </Group>
          )}

          {achievements.length > 0 && (
            <SimpleGrid cols={3} spacing={6}>
              {achievements.map((achievement) => (
                <AchievementTile key={achievement.type} achievement={achievement} />
              ))}
            </SimpleGrid>
          )}
        </>
      )}
    </Stack>
  );
}

const OPEN_DELAY = 150;
const CLOSE_DELAY = 150;

interface UserCardProps extends CardActions {
  user: CardUser;
  /** The trigger, usually the user's name. */
  children: ReactNode;
}

/**
 * Wraps a user name: hovering (or tapping) shows the player card with stats,
 * achievements and Invite / Watch / Follow. Guests and bots get the bare name.
 */
export function UserCard({ user, children, onDirectMessage, onBan }: UserCardProps) {
  const [opened, setOpened] = useState(false);
  const timer = useRef<number>(undefined);

  if (!user.id || user.is_guest || user.is_bot) return <>{children}</>;

  const schedule = (open: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpened(open), delay);
  };
  const hoverProps = {
    onMouseEnter: () => schedule(true, OPEN_DELAY),
    onMouseLeave: () => schedule(false, CLOSE_DELAY),
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" width={330} shadow="md" withinPortal>
      <Popover.Target>
        <span
          className={classes.trigger}
          role="button"
          tabIndex={0}
          {...hoverProps}
          onClick={(event) => {
            event.preventDefault();
            setOpened((value) => !value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setOpened((value) => !value);
            if (event.key === 'Escape') setOpened(false);
          }}
        >
          {children}
        </span>
      </Popover.Target>
      <Popover.Dropdown {...hoverProps}>
        {opened && <CardContent user={user} onDirectMessage={onDirectMessage} onBan={onBan} />}
      </Popover.Dropdown>
    </Popover>
  );
}
