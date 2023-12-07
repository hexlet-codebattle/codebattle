import React, {
 memo,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import {
  currentUserIsAdminSelector,
  currentUserIsTournamentOwnerSelector,
  tournamentShowResultsSelector,
} from '@/selectors';

function TourrnamentPlace({
  place,
  title = '',
  withIcon = false,
}) {
  const showResults = useSelector(tournamentShowResultsSelector);
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const isOwner = useSelector(currentUserIsTournamentOwnerSelector);

  const text = showResults || (isAdmin || isOwner) ? place : '?';
  const prefix = title.length > 0 || withIcon ? ': ' : '';
  const muteResults = (isAdmin || isOwner) && !showResults;

  const className = cn({ 'p-1 bg-light rounded-lg': muteResults });
  const iconClassName = 'text-warning';
  const textClassName = cn({ 'text-muted': muteResults });

  return (
    <span className={className}>
      {withIcon && (
        <FontAwesomeIcon className={iconClassName} icon="trophy" />
      )}
      <span className={textClassName}>
        {title}
        {prefix}
        {text}
      </span>
    </span>
  );
}

export default memo(TourrnamentPlace);
