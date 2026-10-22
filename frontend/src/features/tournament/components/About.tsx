import { Box, Button, Group, Paper, Text } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { Markdown } from '@/shared/Markdown';

import type { Tournament } from '../types';
import type { TournamentApi } from '../useTournament';
import { useCanJoin, useMembershipAction } from './PlayerBar';
import classes from './Room.module.css';

/**
 * A second Join next to the description: people read About first and kept leaving
 * without noticing they have to join. Join only — leaving stays in the header.
 */
function JoinCallout({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();
  const { busy, act } = useMembershipAction(api, false);

  return (
    <Paper withBorder radius="md" p="sm" mb="md">
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Text size="sm">
          {tournament.state === 'active'
            ? t('The tournament is running, you can still jump in.')
            : t("You're not registered yet. Press Join to take part, we'll notify you when it starts.")}
        </Text>
        <Button
          variant="filled"
          color="green"
          className={classes.joinGlow}
          leftSection={<IconUserPlus size={16} />}
          loading={busy}
          onClick={() => act('tournament:join')}
          style={{ flexShrink: 0 }}
        >
          {t('Join')}
        </Button>
      </Group>
    </Paper>
  );
}

/** The organizer's description (Markdown), with a Join prompt for viewers who aren't in yet. */
export function About({ tournament, api }: { tournament: Tournament; api: TournamentApi }) {
  const { t } = useTranslation();
  const canJoin = useCanJoin(tournament, api);

  return (
    <Box p="md">
      {canJoin && <JoinCallout tournament={tournament} api={api} />}
      {tournament.description ? <Markdown>{tournament.description}</Markdown> : <Text c="dimmed">{t('No description yet.')}</Text>}
    </Box>
  );
}
