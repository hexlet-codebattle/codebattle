import { Group, Stack, Text } from '@mantine/core';

import { LEVEL_COLORS, levelLabel } from '@/features/lobby/format';
import type { GameLevel } from '@/features/lobby/types';
import { LangIcon } from '@/shared/LangIcon';
import { UserAvatar } from '@/shared/UserAvatar';

import type { Game, GamePlayer } from '../types';

/** Who opened a game nobody has joined (yet), with its level. */
export function GameCreatorBadge({ game, creator }: { game: Game; creator: GamePlayer }) {
  return (
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
  );
}
