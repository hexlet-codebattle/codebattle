import React from 'react';

import useHover from '../utils/useHover';

import UserInfo from './UserInfo';

function ChatUserInfo({ user, displayMenu, className = '' }) {
  const [ref, hovered] = useHover();

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      className={className}
      title={user.name}
      key={user.id}
      data-user-id={user.id}
      data-user-name={user.name}
      onContextMenu={displayMenu}
      onClick={displayMenu}
      onKeyPress={displayMenu}
    >
      <UserInfo user={user} hovered={hovered} hideInfo hideOnlineIndicator />
    </div>
  );
}

export default ChatUserInfo;
