import { ActionIcon, Button, Group, Popover, Stack, Text, Tooltip } from '@mantine/core';
import { IconBinoculars, IconPlayerPause, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useFollowStore } from './store';
import { setFollowPaused, unfollowUser } from './useMainChannel';

/** Header button for follow mode: pause/resume and unfollow. Hidden while not following anyone. */
export function FollowMenu() {
  const { t } = useTranslation();
  const { followId, followName, paused } = useFollowStore();

  if (!followId) return null;

  const label = t('You are following %{name}', { name: followName || `#${followId}` });

  return (
    <Popover position="bottom-end" width={280} shadow="md">
      <Popover.Target>
        <Tooltip label={label}>
          <ActionIcon size="md" color={paused ? 'gray' : undefined} variant={paused ? 'default' : 'light'} aria-label={label}>
            <IconBinoculars size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={6}>
          <Group gap={6} wrap="nowrap">
            <IconBinoculars size={16} />
            <Text size="sm" truncate>
              {label}
            </Text>
          </Group>
          <Group gap={6}>
            <Button
              size="compact-xs"
              leftSection={paused ? <IconPlayerPlay size={12} /> : <IconPlayerPause size={12} />}
              onClick={() => setFollowPaused(!paused)}
            >
              {paused ? t('Resume') : t('Pause')}
            </Button>
            <Button size="compact-xs" color="red" variant="subtle" leftSection={<IconX size={12} />} onClick={unfollowUser}>
              {t('Unfollow')}
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
