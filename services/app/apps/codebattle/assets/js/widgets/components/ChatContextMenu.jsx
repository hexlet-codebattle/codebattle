import React, { useState, useCallback, useMemo, memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import qs from 'qs';
import { Menu, Item, Separator } from 'react-contexify';
import { useSelector, useDispatch } from 'react-redux';

import { pushCommand } from '@/middlewares/Chat';
import { openDirect } from '@/middlewares/Lobby';
import { currentUserIsAdminSelector, currentUserIdSelector, lobbyDataSelector } from '@/selectors';
import { actions } from '@/slices';
import { getLobbyUrl, getUserProfileUrl } from '@/utils/urlBuilders';

const blackSwordSrc = '/assets/images/fight-black.png';
const whiteSwordSrc = '/assets/images/fight-white.png';

function ChatContextMenu({
  children,
  inputRef,
  menuId,
  request = {
    user: {
      name: null,
      userId: null,
      isBot: false,
      canInvite: false,
    },
  },
}) {
  const dispatch = useDispatch();

  const [swordIconSrc, setSwordIconSrc] = useState(blackSwordSrc);

  const currentUserIsAdmin = useSelector((state) => currentUserIsAdminSelector(state));
  const currentUserId = useSelector(currentUserIdSelector);
  const { activeGames } = useSelector(lobbyDataSelector);

  const { canInvite, isBot, name, userId } = request.user;

  const isCurrentUserHasActiveGames = useMemo(
    () =>
      activeGames || activeGames.length > 0
        ? activeGames.some(({ players }) => players.some(({ id }) => id === currentUserId))
        : true,
    [activeGames, currentUserId],
  );
  const isCurrentUser = !!userId && currentUserId === userId;

  const inviteSendDisabled = isBot || isCurrentUser || isCurrentUserHasActiveGames;
  const canCreatePrivateRoom = !(isBot || isCurrentUser) && !!name;

  const handleCopy = useCallback(() => {
    if (name) {
      navigator.clipboard.writeText(name.valueOf());
    }
  }, [name]);

  const handleOpenDirect = useCallback(() => {
    if (name && userId) {
      dispatch(openDirect(userId, name));

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
        dispatch(actions.showCreateGameInviteModal({ opponentInfo: { id: userId, name } }));
      } else {
        window.location.href = getLobbyUrl(queryParamsString);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const handleSelectInvateMenuItem = useCallback(() => {
    if (!inviteSendDisabled) {
      setSwordIconSrc(whiteSwordSrc);
    }
  }, [setSwordIconSrc, inviteSendDisabled]);

  const handleBlurInvateMenuItem = useCallback(() => {
    if (!inviteSendDisabled) {
      setSwordIconSrc(blackSwordSrc);
    }
  }, [setSwordIconSrc, inviteSendDisabled]);

  const handleBanClick = () => {
    if (userId && name) {
      pushCommand({ type: 'ban', name, user_id: userId });
    }
  };

  return (
    <>
      {children}
      <Menu id={menuId} role="menu">
        <Item aria-label="Copy Name" role="menuitem" onClick={handleCopy}>
          <FontAwesomeIcon className="mr-2" icon="copy" />
          <span>Copy Name</span>
        </Item>
        <Item aria-label="Info" role="menuitem" onClick={handleShowInfo}>
          <FontAwesomeIcon className="mr-2" icon="user" />
          <span>Info</span>
        </Item>
        {canCreatePrivateRoom ? (
          <Item
            aria-label="Direct message"
            disabled={!canCreatePrivateRoom}
            role="menuitem"
            onClick={handleOpenDirect}
          >
            <FontAwesomeIcon className="mr-2" icon="comment-alt" />
            <span>Direct message</span>
          </Item>
        ) : null}
        {canInvite && (
          <Item
            aria-label="Send an invite"
            disabled={inviteSendDisabled}
            role="menuitem"
            onBlur={handleBlurInvateMenuItem}
            onClick={handleCreateInviteModal}
            onFocus={handleSelectInvateMenuItem}
            onMouseEnter={handleSelectInvateMenuItem}
            onMouseLeave={handleBlurInvateMenuItem}
          >
            <img
              alt="invite"
              src={swordIconSrc}
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
            <Item aria-label="Ban" disabled={isBot} onClick={handleBanClick}>
              <FontAwesomeIcon className="mr-2" icon="ban" />
              <span>Ban</span>
            </Item>
          </>
        ) : null}
      </Menu>
    </>
  );
}

export default memo(ChatContextMenu);
