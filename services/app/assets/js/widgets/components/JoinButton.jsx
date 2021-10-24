import React from 'react';

import { leaveTournament, joinTournament } from '../middlewares/Tournament';

const JoinButton = ({ isShow, isParticipant, matchId }) => {
  if (!isShow) {
    return null;
  }

  const onClick = isParticipant ? leaveTournament : joinTournament;
  const text = isParticipant ? 'Leave' : 'Join';

  return (
    <button
      type="button"
      onClick={() => {
        onClick(matchId);
      }}
      className={`btn ${
        isParticipant ? 'btn-outline-danger' : 'btn-outline-secondary'
      }`}
    >
      {text}
    </button>
  );
};

export default JoinButton;
