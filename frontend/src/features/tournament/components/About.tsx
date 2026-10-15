import { Box, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { Markdown } from '@/shared/Markdown';

import type { Tournament } from '../types';

/** The organizer's description (Markdown). */
export function About({ tournament }: { tournament: Tournament }) {
  const { t } = useTranslation();

  return (
    <Box p="md">
      {tournament.description ? <Markdown>{tournament.description}</Markdown> : <Text c="dimmed">{t('No description yet.')}</Text>}
    </Box>
  );
}
