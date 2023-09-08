import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import { leaveTournament, joinTournament } from '../../middlewares/Tournament';

function JoinButton({ disabled = true, isParticipant, isShow, matchId, title }) {
  const onClick = isParticipant ? leaveTournament : joinTournament;
  const text = isParticipant ? 'Leave' : 'Join';
  const actionIcon = isParticipant ? 'user-minus' : 'user-plus';

  return (
    <>
      {title && isShow && <p>{title}</p>}
      <button
        disabled={disabled}
        type="button"
        className={cn('btn text-nowrap rounded-lg', {
          'btn-outline-danger': isParticipant,
          'btn-outline-secondary': !isParticipant,
          'd-none': !isShow,
        })}
        onClick={() => {
          onClick(matchId);
        }}
      >
        <FontAwesomeIcon className="mr-2" icon={actionIcon} />
        {text}
      </button>
    </>
  );
}

export default JoinButton;
