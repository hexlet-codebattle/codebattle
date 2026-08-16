import React from 'react';
import { Box } from '@mantine/core';
import AdminExternalSetupPanel from './AdminExternalSetupPanel';
import { type ExternalSetup } from './types';

interface MainPanelSettingsProps {
  externalSetup: ExternalSetup;
}

const MainPanelSettings = ({ externalSetup }: MainPanelSettingsProps) => (
  <Box
    mt="lg"
    p="md"
    w="100%"
    className="cb-group-tournament-leaderboard-container"
    style={{ overflow: 'auto' }}
  >
    <AdminExternalSetupPanel externalSetup={externalSetup} />
  </Box>
);

export default MainPanelSettings;
