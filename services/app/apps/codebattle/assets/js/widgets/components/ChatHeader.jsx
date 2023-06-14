import React from 'react';
import { useSelector } from 'react-redux';

import * as selectors from '../selectors';
import Rooms from './Rooms';
import { pushCommand } from '../middlewares/Chat';

export default () => {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const handleCleanBanned = () => {
    pushCommand({ type: 'clean_banned' });
  };

  return (
    <div className="d-flex px-3 py-2 pt-3 border-bottom shadow-sm align-items-center">
      <Rooms />
      {currentUserIsAdmin ? (
        <button
          type="button"
          className="btn btn-sm btn-link text-danger"
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
