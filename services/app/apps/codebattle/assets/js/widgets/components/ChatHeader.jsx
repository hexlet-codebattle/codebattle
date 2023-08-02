import React from 'react';
import { useSelector } from 'react-redux';

import * as selectors from '../selectors';
import Rooms from './Rooms';
import { pushCommand } from '../middlewares/Chat';

export default ({ showRooms = false }) => {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const handleCleanBanned = () => {
    pushCommand({ type: 'clean_banned' });
  };

  return (
    <div className="d-flex border-bottom align-items-center">
      {showRooms && <Rooms />}
      {currentUserIsAdmin ? (
        <button
          type="button"
          className="btn btn-sm btn-link text-danger rounded-lg"
          onClick={() => {
            handleCleanBanned();
          }}
        >
          Clean banned
        </button>
      ) : null}
    </div>
  );
};
