import { Button, Card, CopyButton, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconCheck, IconCopy, IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { LangIcon } from '@/shared/LangIcon';
import { MethodButton } from '@/shared/MethodButton';
import { UserAvatar } from '@/shared/UserAvatar';
import { useSharedProps } from '@/shared/useSharedProps';

import type { Game } from '../types';
import classes from '../GameRoom.module.css';

/**
 * A game nobody has joined yet. Its creator gets the invite link and a way out;
 * anyone else can take the seat (guests are asked to sign in).
 */
export function WaitingOpponent({ game }: { game: Game }) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const creator = game.players[0];
  const isCreator = game.players.some((player) => player.id === me.id);
  const link = `${window.location.origin}/games/${game.id}`;

  return (
    <div className={classes.waiting}>
      <Card w={460} maw="100%" padding="xl">
        <Stack gap="md" align="center">
          {creator && (
            <Group gap="sm" wrap="nowrap">
              <UserAvatar user={creator} size={40} />
              <Stack gap={2}>
                <Group gap={6} wrap="nowrap">
                  <LangIcon lang={creator.editor_lang} />
                  <Text fw={700} c="bright">
                    {creator.name}
                  </Text>
                </Group>
                <Group gap={6}>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {creator.rating}
                  </Text>
                  <Text size="xs" fw={700} c={LEVEL_COLORS[game.level as GameLevel] ?? 'dimmed'}>
                    {levelLabel(game.level as GameLevel)}
                  </Text>
                </Group>
              </Stack>
            </Group>
          )}

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
