import React, { memo } from 'react';
import JoinButton from './JoinButton';

import TournamentStates from '../../config/tournament';
import UserInfo from '../../components/UserInfo';

const Players = ({ players }) => (
  <div className="my-3">
    {players.length !== 0 ? (
      <>
        {players.map(player => (
          <UserInfo user={player} hideOnlineIndicator />
        ))}
      </>
    ) : <p>No Participants yet</p>}
  </div>
);

const IndividualIntentedPlayersPanel = ({
    state,
    intentedPlayers,
    participantPlayers,
    currentUserId,
}) => (
  <div className="mt-3">
    <JoinButton
      title="Click join to confirm that you want to participate in this tournament"
      isShow={state === TournamentStates.waitingParticipants && intentedPlayers.some(player => player.id === currentUserId)}
      isParticipant={participantPlayers.some(player => player.id === currentUserId)}
    />
    <h3>Players</h3>
    <Players players={participantPlayers} />
  </div>
    );

export default memo(IndividualIntentedPlayersPanel);
