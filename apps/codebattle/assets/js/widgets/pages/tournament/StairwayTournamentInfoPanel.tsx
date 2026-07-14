/* eslint-disable */
import React, { useState } from 'react';

// TODO: get active round algorithm
const getActiveRoundId = (_rounds?: unknown) => 0;

/* summary
    state,
    currentUserId,
    rounds = [{ task (analog StairwayGameInfo), matches }]
    players = [{ id, name }]
*/

interface StairwayRound {
  id: number;
  [key: string]: unknown;
}

interface StairwayPlayer {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface StairwayTournamentInfoPanelProps {
  state?: string; // "waiting_participants", "active", "game_over"
  currentUserId?: number;
  rounds: StairwayRound[];
  players: StairwayPlayer[];
}

function StairwayTournamentInfoPanel({
  state = 'waiting_participants',
  currentUserId,
  rounds,
  players,
}: StairwayTournamentInfoPanelProps) {
  const [selectedRoundId, setSelectedRoundId] = useState(
    rounds.length === 0 ? 0 : getActiveRoundId(rounds),
  );

  if (state === 'waiting_participants') {
    return;
  }

  const selectedRound = rounds.find((round) => round.id === selectedRoundId);

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
}

export default StairwayTournamentInfoPanel;
