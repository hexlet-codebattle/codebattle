import React from 'react';
import Markdown from 'react-markdown';
import { Box, Text } from '@mantine/core';
import i18n from '../../../i18n';

interface MainPanelDescriptionProps {
  description?: string;
}

const MainPanelDescription = ({ description }: MainPanelDescriptionProps) => (
  <Box
    mt="lg"
    p="md"
    w="100%"
    className="cb-group-tournament-leaderboard-container"
    style={{ overflow: 'auto' }}
  >
    {description ? (
      <Box c="white" m={0}>
        <Markdown>{description}</Markdown>
      </Box>
    ) : (
      <Text c="rgba(255, 255, 255, 0.5)" size="sm">
        {i18n.t('No description provided for this tournament.')}
      </Text>
    )}
  </Box>
);

export default MainPanelDescription;
