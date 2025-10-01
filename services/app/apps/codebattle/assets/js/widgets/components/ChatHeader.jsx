import React from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { pushCommand, pushCommandTypes } from '../middlewares/Chat';
import * as selectors from '../selectors';

import Rooms from './Rooms';

export default function ChatHeader({ showRooms = false, mode, disabled = false }) {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const handleCleanBanned = () => {
    pushCommand({ type: pushCommandTypes.cleanBanned });
  };

  const showBorder = showRooms || (currentUserIsAdmin && !disabled);

  const headerClassName = cn('d-flex align-items-center', {
    'border-bottom border-dark': showBorder && mode !== 'dark',
    'border-bottom cb-border-color': showBorder && mode === 'dark',
  });

  return (
    <div className={headerClassName}>
      {showRooms && !disabled && <Rooms mode={mode} disabled={disabled} />}
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
