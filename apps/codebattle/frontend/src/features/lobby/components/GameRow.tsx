import { ActionIcon, Avatar, Badge, Button, CopyButton, Group, Loader, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconLink, IconRobot, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { UserCard } from '@/features/users/UserCard';
import { UserAvatar } from '@/shared/UserAvatar';
import { LangIcon } from '@/shared/LangIcon';

import { checkProgress, isPlayer, LEVEL_COLORS, levelLabel } from '../format';
import type { LobbyGame, LobbyPlayer } from '../types';
import { gameUrl } from '../useLobbyChannel';

import classes from './GameRow.module.css';

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

function PlayerCell({ player }: { player?: LobbyPlayer }) {
  const { t } = useTranslation();
  if (!player) {
    return (
      <Group gap="xs" wrap="nowrap" className={classes.player}>
        <Loader size={14} type="dots" />
        <Text size="sm" c="dimmed">
          {t('Waiting for opponent')}
        </Text>
      </Group>
    );
  }

  const checking = player.check_result?.status === 'started';
  const progress = checkProgress(player);

  return (
    <Stack gap={4} className={classes.player}>
      <Group gap="xs" wrap="nowrap">
        {player.is_bot ? (
          <Avatar size={22}>
            <IconRobot size={14} />
          </Avatar>
        ) : (
          <UserAvatar user={player} size={22} />
        )}
        <LangIcon lang={player.editor_lang} />
        <UserCard user={player}>
          <Text span size="sm" fw={600} c={checking ? 'dimmed' : 'bright'} truncate display="block">
            {player.name}
          </Text>
        </UserCard>
        {player.rating != null && (
          <Text size="xs" c="dimmed" ff="monospace">
            {player.rating}
          </Text>
        )}
        {checking && <Loader size={12} />}
      </Group>
      <Progress size={3} value={progress} color={progress === 100 ? 'green' : 'slate'} />
    </Stack>
  );
}

interface GameRowProps {
  game: LobbyGame;
  userId: number;
  /** False while the lobby channel is reconnecting; cancel needs it. */
  online: boolean;
  onCancel: (gameId: number) => void;
}

function GameActions({ game, userId, online, onCancel }: GameRowProps) {
  const { t } = useTranslation();
  const url = gameUrl(game.id);
  const mine = isPlayer(game, userId);

  if (game.state === 'playing') {
    return (
      <Button component="a" href={url} size="xs" variant={mine ? 'filled' : 'default'} color={mine ? 'green' : undefined}>
        {mine ? t('Continue') : t('Watch')}
      </Button>
    );
  }

  if (mine) {
    return (
      <Group gap={4} wrap="nowrap">
        <Button component="a" href={url} size="xs" variant="filled" color="green">
          {t('Continue')}
        </Button>
        <CopyButton value={`${window.location.origin}${url}`}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? t('Copied') : t('Copy invite link')}>
              <ActionIcon onClick={copy} aria-label={t('Copy invite link')}>
                {copied ? <IconCheck size={16} /> : <IconLink size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
        <Tooltip label={t('Cancel game')}>
          <ActionIcon
            color="red"
            variant="subtle"
            disabled={!online}
            onClick={() => onCancel(game.id)}
            aria-label={t('Cancel game')}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  // Joining is a regular form post; the server adds the player and redirects into the game.
  return (
    <form method="post" action={`${url}/join`}>
      <input type="hidden" name="_csrf_token" value={csrfToken()} />
      <Button type="submit" size="xs" variant="filled" color="red">
        {t('Fight')}
      </Button>
    </form>
  );
}

export function GameRow(props: GameRowProps) {
  const [first, second] = props.game.players;
  const { game } = props;

  return (
    <div className={classes.row}>
      <Badge color={LEVEL_COLORS[game.level]} variant="light" size="sm" className={classes.level}>
        {levelLabel(game.level)}
      </Badge>
      <div className={classes.players}>
        <PlayerCell player={first} />
        <Text size="xs" c="dimmed" fw={700} className={classes.vs}>
          VS
        </Text>
        <PlayerCell player={second} />
      </div>
      <div className={classes.actions}>
        <GameActions {...props} />
      </div>
    </div>
  );
}
