import React, { memo } from 'react';

import UserInfo from '../../components/UserInfo';
import TournamentStates from '../../config/tournament';

import JoinButton from './JoinButton';

function Players({ players }) {
  return (
    <div className="my-3">
      {players.length !== 0 ? (
        <>
          {players.map((player) => (
            <UserInfo hideOnlineIndicator user={player} />
          ))}
        </>
      ) : (
        <p>No Participants yet</p>
      )}
    </div>
  );
}

function IndividualIntentedPlayersPanel({
  currentUserId,
  intentedPlayers,
  participantPlayers,
  state,
}) {
  return (
    <div className="mt-3">
      <JoinButton
        isParticipant={participantPlayers.some((player) => player.id === currentUserId)}
        title="Click join to confirm that you want to participate in this tournament"
        isShow={
          state === TournamentStates.waitingParticipants &&
          intentedPlayers.some((player) => player.id === currentUserId)
        }
      />
      <h3>Players</h3>
      <Players players={participantPlayers} />
    </div>
  );
}

export default memo(IndividualIntentedPlayersPanel);
