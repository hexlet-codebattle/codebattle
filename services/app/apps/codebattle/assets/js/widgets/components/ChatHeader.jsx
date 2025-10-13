import React from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { pushCommand, pushCommandTypes } from '../middlewares/Chat';
import * as selectors from '../selectors';

import Rooms from './Rooms';

export default function ChatHeader({ showRooms = false, disabled = false }) {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const handleCleanBanned = () => {
    pushCommand({ type: pushCommandTypes.cleanBanned });
  };

  const showBorder = showRooms || (currentUserIsAdmin && !disabled);

  const headerClassName = cn('d-flex align-items-center', {
    'border-bottom cb-border-color': showBorder,
  });

  return (
    <div className={headerClassName}>
      {showRooms && !disabled && <Rooms disabled={disabled} />}
      {currentUserIsAdmin && !disabled && (
        <button
          type="button"
          className="btn btn-sm btn-link text-danger cb-rounded"
          onClick={() => {
            handleCleanBanned();
          }}
          disabled={disabled}
        >
          Clean banned
        </button>
      )}
    </div>
  );
}
