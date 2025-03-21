import React, { useContext } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import i18next from '../../../i18n';
import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import { leaveTournament, joinTournament } from '../../middlewares/Tournament';

const JoinButton = ({
  isShow, isParticipant, title, teamId, disabled = false, isShowLeave = true,
}) => {
  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const onClick = isParticipant ? leaveTournament : joinTournament;
  const text = isParticipant ? i18next.t('Leave') : i18next.t('Join');
  const actionIcon = isParticipant ? 'user-minus' : 'user-plus';

  if (isParticipant && !isShowLeave) {
    return null;
  }

  return (
    <>
      {title && isShow && <p>{title}</p>}
      <button
        type="button"
        onClick={() => {
          onClick(teamId);
        }}
        className={cn('btn text-nowrap rounded-lg', {
          'btn-outline-danger': isParticipant && !hasCustomEventStyles,
          'btn-outline-secondary': !isParticipant && !hasCustomEventStyles,
          'cb-custom-event-btn-outline-danger': isParticipant && hasCustomEventStyles,
          'cb-custom-event-btn-outline-secondary': !isParticipant && hasCustomEventStyles,
          'd-none': !isShow,
        })}
        disabled={disabled}
      >
        <FontAwesomeIcon className="mr-2" icon={actionIcon} />
        {text}
      </button>
    </>
  );
};

export default JoinButton;
