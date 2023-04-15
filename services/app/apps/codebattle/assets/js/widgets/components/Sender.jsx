import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Menu,
  Item,
  Separator,
  useContextMenu,
} from 'react-contexify';

import {
  currentUserIsAdminSelector,
  currentUserIdSelector,
  lobbyDataSelector,
  secondPlayerSelector,
} from '../selectors';
import { pushCommand } from '../middlewares/Chat';
import { actions } from '../slices';
import { calculateExpireDate } from '../middlewares/Room';

const Sender = ({
  messageId,
  name,
  userId,
  handleShowModal,
}) => {
  const dispatch = useDispatch();
  const currentUserIsAdmin = useSelector(state => currentUserIsAdminSelector(state));
  const currentUserId = useSelector(currentUserIdSelector);
  const { activeGames } = useSelector(lobbyDataSelector);
  const isCurrentUserHasActiveGames = activeGames.some(({ players }) => players.some(({ id }) => id === currentUserId));
  const isCurrentUserMessage = currentUserId === userId;
  const opponent = useSelector(secondPlayerSelector);
  const isBot = !!opponent?.isBot && userId === opponent?.id;

  const menuId = `menu-${messageId}`;
  const { show } = useContextMenu({ id: menuId });

  const handleBanClick = bannedName => {
    pushCommand({ type: 'ban', name: bannedName, user_id: userId });
  };

  const displayMenu = event => show({ event });

  return (
    <div>
      <a href={`/users/${userId}`} onContextMenu={displayMenu}>
        <span className="font-weight-bold">{`${name}: `}</span>
      </a>

      <Menu id={menuId}>
        <Item
          onClick={handleShowModal}
          disabled={isBot || isCurrentUserMessage || isCurrentUserHasActiveGames}
        >
          Send an invite
        </Item>
        <Item
          onClick={() => {
            const roomData = {
              id: userId,
              name,
              expiry: calculateExpireDate(),
            };

            dispatch(actions.createPrivateRoom(roomData));
          }}
          disabled={isBot || isCurrentUserMessage}
        >
          Direct message
        </Item>
        {currentUserIsAdmin ? (
          <>
            <Separator />
            <Item onClick={() => handleBanClick(name)}>
              Ban
            </Item>
          </>
        ) : null}
      </Menu>
    </div>
  );
};

export default Sender;
