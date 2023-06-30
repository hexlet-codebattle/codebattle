import React, { useCallback, useMemo, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import qs from 'qs';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Menu,
  Item,
  Separator,
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
import { getSystemMessage } from '../utils/chat';

const ChatContextMenu = ({
  request = {
    user: {
      name: null,
      userId: null,
      isBot: false,
      canInvite: false,
    },
  },
  menuId,
  inputRef,
  children,
}) => {
  const dispatch = useDispatch();
  const currentUserIsAdmin = useSelector(state => currentUserIsAdminSelector(state));
  const currentUserId = useSelector(currentUserIdSelector);
  const { activeGames } = useSelector(lobbyDataSelector);

  const {
    isBot,
    canInvite,
    name,
    userId,
  } = request.user;

  const handleCopy = useCallback(() => {
    if (name) {
      navigator.clipboard.writeText(name.valueOf());
    }
  }, [name]);

  const handleOpenDirect = useCallback(() => {
    if (name && userId) {
      const expireTo = calculateExpireDate();
      const roomData = {
        targetUserId: userId,
        name,
        expireTo,
      };

      const message = getSystemMessage({
        text: `You join private channel with ${name}. You can send personal message`,
      });

      dispatch(actions.newChatMessage(message));
      dispatch(actions.createPrivateRoom(roomData));

      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, userId]);

  const handleShowInfo = useCallback(() => {
    if (userId) {
      window.location.href = getUserProfileUrl(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCreateInviteModal = useCallback(() => {
    if (userId && name) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const isCurrentUserHasActiveGames = useMemo(
    () => (
      activeGames || activeGames.length > 0
        ? activeGames.some(({ players }) => players.some(({ id }) => id === currentUserId))
        : true
    ),
    [activeGames, currentUserId],
  );
  const isCurrentUser = !!userId && currentUserId === userId;

  const inviteSendDisabled = isBot || isCurrentUser || isCurrentUserHasActiveGames;
  const canCreatePrivateRoom = !(isBot || isCurrentUser) && !!name;

  const handleBanClick = () => {
    if (userId && name) {
      pushCommand({ type: 'ban', name, user_id: userId });
    }
  };

  return (
    <>
      {children}
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
        {canCreatePrivateRoom ? (
          <Item
            role="menuitem"
            aria-label="Direct message"
            onClick={handleOpenDirect}
          >
            <FontAwesomeIcon
              className="mr-2"
              icon="comment-alt"
            />
            <span>Direct message</span>
          </Item>
        ) : null}
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
        {currentUserIsAdmin ? (
          <>
            <Separator />
            <Item
              aria-label="Ban"
              onClick={handleBanClick}
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
    </>
  );
};

export default memo(ChatContextMenu);
