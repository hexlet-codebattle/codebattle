import { Badge, Group, Modal, Text } from '@mantine/core';
import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useVisibleGames } from '../useVisibleGames';

import classes from './ActiveGamesModal.module.css';
import { GameRow } from './GameRow';

interface ActiveGamesModalProps {
  opened: boolean;
  onClose: () => void;
  userId: number;
  online: boolean;
  onCancel: (gameId: number) => void;
}

export function ActiveGamesModal({ opened, onClose, userId, online, onCancel }: ActiveGamesModalProps) {
  const { t } = useTranslation();
  const games = useVisibleGames(userId);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      classNames={{ body: classes.body }}
      title={
        <Group gap="xs">
          <IconSwords size={18} />
          <span>{t('Join a battle')}</span>
          <Badge variant="default">{games.length}</Badge>
        </Group>
      }
    >
      {games.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          {t('There are no active games right now. Create one!')}
        </Text>
      ) : (
        games.map((game) => <GameRow key={game.id} game={game} userId={userId} online={online} onCancel={onCancel} />)
      )}
    </Modal>
  );
}
