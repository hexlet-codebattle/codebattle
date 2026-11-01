import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconInfoCircle, IconPlugConnected } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import classes from './PromoCard.module.css';

/** Invite players to play from their AI assistant (the /mcp promo page). */
export function McpBanner() {
  const { t } = useTranslation();

  return (
    <div className={`${classes.banner} ${classes.mcp}`}>
      <Group gap="sm" wrap="nowrap">
        <IconPlugConnected size={36} stroke={1.5} className={classes.icon} />
        <Stack gap={0} miw={0} flex={1}>
          <Group gap={6} wrap="nowrap" className={classes.title}>
            <Text fw={700} c="bright">
              {t('Codebattle MCP')}
            </Text>
            <Badge size="xs" variant="light" color="teal">
              {t('New')}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {t('Connect your AI assistant to find tasks, start games, and run tournaments right from the chat.')}
          </Text>
        </Stack>
      </Group>
      <div className={classes.actions}>
        <Button component="a" href="/mcp" variant="default" size="compact-sm" leftSection={<IconInfoCircle size={14} />}>
          {t('Learn more')}
        </Button>
        <Button
          component="a"
          href="/mcp#connect"
          variant="light"
          color="teal"
          size="compact-sm"
          leftSection={<IconPlugConnected size={14} />}
        >
          {t('Connect')}
        </Button>
      </div>
    </div>
  );
}
