import React from "react";
import AdminExternalSetupPanel from "./AdminExternalSetupPanel";

const MainPanelSettings = ({ externalSetup }) => (
  <div
    className="mt-3 p-3 w-100 overflow-auto cb-group-tournament-leaderboard-container"
  >
    <AdminExternalSetupPanel externalSetup={externalSetup} />
  </div>
);

export default MainPanelSettings;
