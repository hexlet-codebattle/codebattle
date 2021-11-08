import React, { useState } from 'react';

// TODO: get active round algoritm
const getActiveRoundId = () => 0;

/* summary
    state,
    currentUserId,
    rounds = [{ task (analog StairwayGameInfo), matches }]
    players = [{ id, name }]
*/

const StairwayTournamentInfoPanel = ({
    state = 'waiting_participants', // "waiting_participants", "active", "game_over"
    currentUserId,
    rounds,
    players,
}) => {
    const [selectedRoundId, setSelectedRoundId] = useState(rounds.length === 0 ? 0 : getActiveRoundId(rounds));

    if (state === 'waiting_participants') {
        return;
    }

    const selectedRound = rounds.find(round => round.id === selectedRoundId);

    return (
      <>
        {/* <StairwayTournamentRoundList
      selectedRoundId={selectedRoundId}
      setSelectedRoundId={setSelectedRoundId}
      rounds={rounds} // [{ state, id }] state: (selected, begin, over, not started)"
    /> */}
        {/* <Panel>
        <StairwayTournamentMatchTable
            currentUserId={currentUserId}
            round={selectedRound}
            players={players}
        />

        <TaskInfo
            task={round.task}
        />
    </Panel> */}
      </>
    );
};

export default StairwayTournamentInfoPanel;
