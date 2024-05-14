import React, {
 memo,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import {
  currentUserIsAdminSelector,
  currentUserIsTournamentOwnerSelector,
  tournamentHideResultsSelector,
} from '@/selectors';

function TourrnamentPlace({
  place,
  title = '',
  withIcon = false,
}) {
  const hideResults = useSelector(tournamentHideResultsSelector);
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const isOwner = useSelector(currentUserIsTournamentOwnerSelector);

  const text = !hideResults || (isAdmin || isOwner) ? place : '?';
  const prefix = title.length > 0 || withIcon ? ': ' : '';
  const muteResults = (isAdmin || isOwner) && hideResults;

  const className = cn({ 'p-1 bg-light rounded-lg': muteResults });
  const iconClassName = 'text-warning';
  const textClassName = cn({ 'text-muted': muteResults });

  return (
    <span className={className}>
      {withIcon && (
        <FontAwesomeIcon className={iconClassName} icon="trophy" />
      )}
      <span className={textClassName}>
        {i18next.t(title)}
        {prefix}
        {text}
      </span>
    </span>
  );
}

export default memo(TourrnamentPlace);
