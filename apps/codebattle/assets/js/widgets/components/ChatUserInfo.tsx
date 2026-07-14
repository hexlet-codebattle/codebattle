import React from 'react';

import useHover from '../utils/useHover';

import UserInfo from './UserInfo';
import { type UserNameUser } from './UserName';

interface ChatUserInfoProps {
  user: UserNameUser;
  displayMenu?: (event: React.MouseEvent | React.KeyboardEvent) => void;
  className?: string;
  mode?: string;
}

function ChatUserInfo({ user, displayMenu, className = '' }: ChatUserInfoProps) {
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
      <UserInfo
        user={user}
        hovered={hovered}
        className={className}
        displayName={undefined}
        hideInfo
        hideOnlineIndicator
      />
    </div>
  );
}

export default ChatUserInfo;
