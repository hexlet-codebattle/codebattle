import React from 'react';
import AdminExternalSetupPanel from './AdminExternalSetupPanel';
import { type ExternalSetup } from './types';

interface MainPanelSettingsProps {
  externalSetup: ExternalSetup;
}

const MainPanelSettings = ({ externalSetup }: MainPanelSettingsProps) => (
  <div className="mt-3 p-3 w-100 overflow-auto cb-group-tournament-leaderboard-container">
    <AdminExternalSetupPanel externalSetup={externalSetup} />
  </div>
);

export default MainPanelSettings;
