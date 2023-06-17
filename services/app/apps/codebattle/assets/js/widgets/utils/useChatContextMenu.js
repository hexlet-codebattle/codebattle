import { useCallback, useState, useMemo } from 'react';
import { useContextMenu } from 'react-contexify';

const useChatContextMenu = ({
  type,
  users,
  canInvite = false,
}) => {
  const menuId = useMemo(() => `${type}-chat`, [type]);
  const { show } = useContextMenu({ id: menuId });

  const [menuRequest, setMenuRequest] = useState();

  const displayMenu = useCallback(event => {
    const { userId } = event.currentTarget.dataset;
    const user = users.find(({ id }) => String(id) === userId);

    if (user) {
      setMenuRequest({
        user: {
          name: user.name,
          isBot: user.isBot || false,
          userId: user.id,
          canInvite,
        },
      });
      show({ event });
    }
  }, [show, users, canInvite, setMenuRequest]);

  return {
    menuId,
    menuRequest,
    displayMenu,
  };
};

export default useChatContextMenu;
