import React, { useCallback, useState, useMemo } from 'react';

import { useContextMenu } from 'react-contexify';

interface ChatUser {
  id: number;
  name?: string;
  isBot?: boolean;
  githubName?: string;
}

interface MenuRequest {
  user: {
    name?: string;
    isBot?: boolean;
    userId: number;
    githubName?: string;
    canInvite: boolean;
  };
}

const useChatContextMenu = ({
  type,
  users,
  canInvite = false,
}: {
  type: string;
  users: ChatUser[];
  canInvite?: boolean;
}) => {
  const menuConf = useMemo(() => ({ id: `${type}-chat` }), [type]);
  const { show } = useContextMenu(menuConf);

  const [menuRequest, setMenuRequest] = useState<MenuRequest>();

  const displayMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const { userId, userName } = event.currentTarget.dataset;

      if (!userId) {
        return;
      }

      const user = users.find(({ id }) => id === Number(userId));
      const request = {
        user: {
          name: user?.name || userName,
          isBot: user?.isBot,
          userId: user?.id || Number(userId),
          githubName: user?.githubName,
          canInvite: user ? canInvite : false,
        },
      };

      setMenuRequest(request);
      show({ event });
    },
    [show, users, canInvite, setMenuRequest],
  );

  return {
    menuId: menuConf.id,
    menuRequest,
    displayMenu,
  };
};

export default useChatContextMenu;
