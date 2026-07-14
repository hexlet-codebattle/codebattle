/* eslint-disable */
import React, { useState } from 'react';

interface StairwayTournamentApprovedListPanelProps {
  state: string;
  creatorId?: number;
  currentUserId?: number;
  players?: unknown[];
  notApprovedList?: unknown[];
}

function StairwayTournamentApprovedListPanel({
  state,
  creatorId,
  currentUserId,
  players = [],
  notApprovedList = [],
}: StairwayTournamentApprovedListPanelProps) {
  if (state !== 'waiting_participants') {
    return;
  }

  return (
    <>
      {/* <Panel>

            <StairwayPlayerList
                players={players}
                currentUserId={currentUserId}
            />

            <StairwayNotApprovedList
                notApprovedList={notApprovedList}
                currentUserId={currentUserId}
            />

        </Panel> */}
    </>
  );
}

export default StairwayTournamentApprovedListPanel;
