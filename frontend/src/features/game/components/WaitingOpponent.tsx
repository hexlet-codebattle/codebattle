import { Button, Card, CopyButton, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconMessageShare, IconSwords } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { shareableGameUrl } from '@/features/chat/linkify';
import { shareToLobbyChat, wasShared } from '@/features/chat/shareToLobby';
import { MethodButton } from '@/shared/MethodButton';
import { useSharedProps } from '@/shared/useSharedProps';

import type { Game } from '../types';
import classes from '../GameRoom.module.css';

import { GameCreatorBadge } from './GameCreatorBadge';

/**
 * A game nobody has joined yet. Its creator gets the invite link and a way out;
 * anyone else can take the seat (guests are asked to sign in).
 */
export function WaitingOpponent({ game }: { game: Game }) {
  const { t } = useTranslation();
  const { current_user: me, user_token: token } = useSharedProps();
  const creator = game.players[0];
  const isCreator = game.players.some((player) => player.id === me.id);
  const link = shareableGameUrl(game.id);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(() => wasShared(game.id));

  // Once per game and session, so the lobby chat doesn't fill with the same invite.
  const share = async () => {
    setSharing(true);
    try {
      await shareToLobbyChat(token, game.id);
      setShared(true);
      notifications.show({ color: 'green', message: t('Invite posted to the lobby chat') });
    } catch {
      notifications.show({ color: 'red', message: t('Could not post to the lobby chat. Try again.') });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={classes.waiting}>
      <Card w={460} maw="100%" padding="xl">
        <Stack gap="md" align="center">
          {creator && <GameCreatorBadge game={game} creator={creator} />}

          {isCreator ? (
            <>
              <Loader type="dots" />
              <Title order={3} ta="center">
                {t('Waiting for an opponent')}
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                {t('Send this link to a friend; the game starts as soon as they join.')}
              </Text>
              <TextInput
                w="100%"
                readOnly
                value={link}
                onFocus={(event) => event.currentTarget.select()}
                rightSectionWidth={40}
                rightSection={
                  <CopyButton value={link}>
                    {({ copied, copy }) => (
                      <Button size="compact-xs" variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} aria-label={t('Copy')}>
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </Button>
                    )}
                  </CopyButton>
                }
              />
              <Button
                fullWidth
                variant="light"
                color="green"
                leftSection={shared ? <IconCheck size={16} /> : <IconMessageShare size={16} />}
                loading={sharing}
                disabled={shared}
                onClick={share}
              >
                {shared ? t('Shared in the lobby chat') : t('Share in the lobby chat')}
              </Button>
              <Group gap="xs">
                <Button component="a" href="/" variant="default">
                  {t('Back to lobby')}
                </Button>
                <MethodButton action={`/games/${game.id}`} method="delete" color="red" variant="light">
                  {t('Cancel game')}
                </MethodButton>
              </Group>
            </>
          ) : (
            <>
              <Title order={3} ta="center">
                {t('%{name} is looking for an opponent', { name: creator?.name ?? '' })}
              </Title>
              <Group gap="xs">
                <Button component="a" href="/" variant="default">
                  {t('Back to lobby')}
                </Button>
                {me.is_guest ? (
                  <Button component="a" href="/session/new" color="green">
                    {t('Sign in')}
                  </Button>
                ) : (
                  <MethodButton action={`/games/${game.id}/join`} method="post" color="green" leftSection={<IconSwords size={16} />}>
                    {t('Join game')}
                  </MethodButton>
                )}
              </Group>
            </>
          )}
        </Stack>
      </Card>
    </div>
  );
}
