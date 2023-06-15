import React, { useCallback, useMemo, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import qs from 'qs';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
} from '../selectors';
import { pushCommand } from '../middlewares/Chat';
import { actions } from '../slices';
import { calculateExpireDate } from '../middlewares/Room';
import { getLobbyUrl, getUserProfileUrl } from '../utils/urlBuilders';

const UserContextMenu = ({
  menuId,
  name,
  userId,
  isBot,
  canInvite = true,
  children,
}) => {
  const dispatch = useDispatch();
  const currentUserIsAdmin = useSelector(state => currentUserIsAdminSelector(state));
  const currentUserId = useSelector(currentUserIdSelector);
  const { activeGames } = useSelector(lobbyDataSelector);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(name.valueOf());
  }, [name]);

  const handleShowInfo = useCallback(() => {
    window.location.href = getUserProfileUrl(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCreateInviteModal = useCallback(() => {
    const queryParamsString = qs.stringify({
      opponent_id: userId,
    });
    if (`/${window.location.hash}`.startsWith(getLobbyUrl())) {
      window.location.href = getLobbyUrl(queryParamsString);
    } else {
      dispatch(
        actions.showCreateGameInviteModal({ opponentInfo: { id: userId, name } }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, name]);

  const isCurrentUserHasActiveGames = useMemo(
    () => (
      activeGames || activeGames.length > 0
        ? activeGames.some(({ players }) => players.some(({ id }) => id === currentUserId))
        : true
    ),
    [activeGames, currentUserId],
  );

  const isCurrentUserMessage = currentUserId === userId;

  const inviteSendDisabled = isBot || isCurrentUserMessage || isCurrentUserHasActiveGames;
  const canCreatePrivateRoom = !(isBot || isCurrentUserMessage);

  const { show } = useContextMenu({ id: menuId });

  const handleBanClick = bannedName => {
    pushCommand({ type: 'ban', name: bannedName, user_id: userId });
  };

  const displayMenu = event => show({ event });

  return (
    <div>
      <div title={name} onContextMenu={displayMenu}>{children}</div>
      <Menu role="menu" id={menuId}>
        <Item
          role="menuitem"
          aria-label="Copy Name"
          onClick={handleCopy}
        >
          <FontAwesomeIcon
            className="mr-2"
            icon="copy"
          />
          <span>Copy Name</span>
        </Item>
        <Item
          role="menuitem"
          aria-label="Info"
          onClick={handleShowInfo}
        >
          <FontAwesomeIcon
            className="mr-2"
            icon="user"
          />
          <span>Info</span>
        </Item>
        {canInvite && (
          <Item
            role="menuitem"
            aria-label="Send an invite"
            onClick={handleCreateInviteModal}
            disabled={inviteSendDisabled}
          >
            <img
              alt="invite"
              src="/assets/images/fight-black.png"
              style={{ width: 14, height: 16 }}
              className={cn('mr-2', {
                'text-muted': !inviteSendDisabled,
              })}
            />
            <span>Send an invite</span>
          </Item>
        )}
        {canCreatePrivateRoom ? (
          <Item
            role="menuitem"
            aria-label="Direct message"
            onClick={() => {
              const roomData = {
                targetUserId: userId,
                name,
                exprireTo: calculateExpireDate(),
              };

              dispatch(actions.createPrivateRoom(roomData));
            }}
          >
            <FontAwesomeIcon
              className="mr-2"
              icon="comment-alt"
            />
            <span>Direct message</span>
          </Item>
        ) : null}
        {currentUserIsAdmin ? (
          <>
            <Separator />
            <Item
              aria-label="Ban"
              onClick={() => handleBanClick(name)}
              disabled={isBot}
            >
              <FontAwesomeIcon
                className="mr-2"
                icon="ban"
              />
              <span>Ban</span>
            </Item>
          </>
        ) : null}
      </Menu>
    </div>
  );
};

export default memo(UserContextMenu);
