import React from 'react';

import { useSelector } from 'react-redux';

import { pushCommand, pushCommandTypes } from '../middlewares/Chat';
import * as selectors from '../selectors';

import Rooms from './Rooms';

export default function ChatHeader({ disabled = false, showRooms = false }) {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const handleCleanBanned = () => {
    pushCommand({ type: pushCommandTypes.cleanBanned });
  };

  return (
    <div className="d-flex border-bottom align-items-center">
      {showRooms && <Rooms disabled={disabled} />}
      {currentUserIsAdmin && (
        <button
          className="btn btn-sm btn-link text-danger rounded-lg"
          disabled={disabled}
          type="button"
          onClick={() => {
            handleCleanBanned();
          }}
        >
          Clean banned
        </button>
      )}
    </div>
  );
}
