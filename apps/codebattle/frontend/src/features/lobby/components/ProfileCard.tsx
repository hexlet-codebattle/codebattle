import { Anchor, Badge, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';
import { UserAvatar } from '@/shared/UserAvatar';
import { LangIcon } from '@/shared/LangIcon';

import { formatDate } from '../format';
import type { LobbyGame } from '../types';
import { gameUrl } from '../useLobbyChannel';

import classes from './ProfileCard.module.css';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack gap={0} align="center" className={classes.stat}>
      <Text ff="monospace" fw={700} c="bright" lh={1.3}>
        {value}
      </Text>
      <Text fz={11} c="dimmed" lh={1.2}>
        {label}
      </Text>
    </Stack>
  );
}

interface ProfileCardProps {
  /** The current user's unfinished lobby game, if any: the main button continues it. */
  activeGame: LobbyGame | undefined;
  online: boolean;
  /** Joinable/watchable games, shown on the "Join a battle" button. */
  gamesCount: number;
  onCreate: () => void;
  onJoin: () => void;
}

export function ProfileCard({ activeGame, online, gamesCount, onCreate, onJoin }: ProfileCardProps) {
  const { t } = useTranslation();
  const { current_user: user, current_season: season } = useSharedProps();
  const clan = typeof user.clan === 'string' && user.clan ? user.clan : null;

  return (
    <Card padding="sm">
      <Stack gap="sm">
        <Group gap="sm" wrap="nowrap">
          <UserAvatar user={user} size={44} />
          <Stack gap={0} miw={0} flex={1}>
            <Group gap={6} wrap="nowrap" miw={0}>
              <LangIcon lang={user.lang} size={18} />
              <Anchor href={`/users/${user.id}`} fw={700} c="bright" truncate>
                {user.name}
              </Anchor>
            </Group>
            {clan ? (
              <Text size="xs" c="dimmed" truncate>
                {clan}
              </Text>
            ) : (
              <Anchor href="/settings" size="xs">
                {t('Add clan')}
              </Anchor>
            )}
          </Stack>
          {season && (
            <Anchor href={`/seasons/${season.id}`} size="xs" c="dimmed" ta="right" className={classes.season}>
              {t('Season %{name}', { name: season.name })}
              <br />
              {t('until %{date}', { date: formatDate(season.ends_at) })}
            </Anchor>
          )}
        </Group>

        <SimpleGrid cols={3} spacing={0} className={classes.stats}>
          <Stat label={t('Elo')} value={user.rating ?? '—'} />
          <Stat label={t('Place')} value={user.points ? `#${user.rank}` : '—'} />
          <Stat label={t('Points')} value={user.points ?? 0} />
        </SimpleGrid>

        <SimpleGrid cols={2} spacing="xs">
          {activeGame ? (
            <Button component="a" href={gameUrl(activeGame.id)} size="sm" px="xs">
              {t('Continue')}
            </Button>
          ) : (
            <Button size="sm" px="xs" onClick={onCreate} loading={!online}>
              {t('Create battle')}
            </Button>
          )}
          <Button
            size="sm"
            px="xs"
            onClick={onJoin}
            rightSection={
              gamesCount > 0 ? (
                <Badge size="xs" variant="light" color="gray">
                  {gamesCount}
                </Badge>
              ) : null
            }
          >
            {t('Join battle')}
          </Button>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
