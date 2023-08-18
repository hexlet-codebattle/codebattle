import React from 'react';
import { useSelector } from 'react-redux';

import Rooms from './Rooms';

import * as selectors from '../selectors';
import { pushCommand, pushCommandTypes } from '../middlewares/Chat';

export default function ChatHeader({ showRooms = false, disabled = false }) {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const handleCleanBanned = () => {
    pushCommand({ type: pushCommandTypes.cleanBanned });
  };

  return (
    <div className="d-flex border-bottom align-items-center">
      {showRooms && <Rooms disabled={disabled} />}
      {currentUserIsAdmin && (
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
