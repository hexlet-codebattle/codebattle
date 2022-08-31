import React from 'react';

import { leaveTournament, joinTournament } from '../middlewares/Tournament';

const JoinButton = ({
 isShow, isParticipant, title, matchId,
}) => {
  if (!isShow) {
    return null;
  }

  const onClick = isParticipant ? leaveTournament : joinTournament;
  const text = isParticipant ? 'Leave' : 'Join';

  return (
    <>
      {title && <p>{title}</p>}
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
    </>
  );
};

export default JoinButton;
