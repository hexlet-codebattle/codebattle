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

  const headerClassName = cn(
    'd-flex align-items-center', {
      'border-bottom': (showRooms || (currentUserIsAdmin && !disabled)),
    },
  );

  return (
    <div className={headerClassName}>
      {showRooms && <Rooms disabled={disabled} />}
      {currentUserIsAdmin && !disabled && (
        <button
          type="button"
          className="btn btn-sm btn-link text-danger rounded-lg"
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
