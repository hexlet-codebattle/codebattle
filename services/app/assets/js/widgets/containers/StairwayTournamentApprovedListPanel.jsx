import React, { useState } from 'react';

const StairwayTournamentApprovedListPanel = ({
    state,
    creatorId,
    currentUserId,
    players = [],
    notApprovedList = [],
}) => {
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
};

export default StairwayTournamentApprovedListPanel;
