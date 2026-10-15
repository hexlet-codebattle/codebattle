import { Button, Card, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBan, IconClockX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';

import type { Game } from '../types';
import classes from '../GameRoom.module.css';

import { GameCreatorBadge } from './GameCreatorBadge';

/** A game that ended before an opponent joined: there is no battle to show, only what happened. */
export function GameCanceled({ game }: { game: Game }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const creator = game.players[0];
  const canceled = game.state === 'canceled';
  const mine = creator?.id === me.id;

  let reason: string;
  if (!canceled) reason = t('Nobody joined before the time ran out.');
  else if (mine || !creator) reason = t('The game was canceled before anyone joined.');
  else reason = t('%{name} canceled the game before anyone joined.', { name: creator.name });

  return (
    <div className={classes.waiting}>
      <Card w={460} maw="100%" padding="xl">
        <Stack gap="md" align="center">
          {creator && <GameCreatorBadge game={game} creator={creator} />}
          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
            {canceled ? <IconBan size={26} /> : <IconClockX size={26} />}
          </ThemeIcon>
          <Title order={3} ta="center">
            {canceled ? t('Game canceled') : t('Game expired')}
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            {reason}
          </Text>
          <Button component="a" href="/">
            {t('Back to lobby')}
          </Button>
        </Stack>
      </Card>
    </div>
  );
}
