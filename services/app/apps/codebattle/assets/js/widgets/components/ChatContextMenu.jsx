import React, { useState, useCallback, useMemo, memo } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import qs from "qs";
import { Menu, Item, Separator } from "react-contexify";
import { useSelector, useDispatch } from "react-redux";

import { pushCommand } from "@/middlewares/Chat";
import { openDirect } from "@/middlewares/Lobby";
import { followUser } from "@/middlewares/Main";
import { currentUserIsAdminSelector, currentUserIdSelector, lobbyDataSelector } from "@/selectors";
import { actions } from "@/slices";
import { getLobbyUrl, getUserProfileUrl } from "@/utils/urlBuilders";

const blackSwordSrc = "/assets/images/fight-black.png";
const whiteSwordSrc = "/assets/images/fight-white.png";

function ChatContextMenu({
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
}) {
  const dispatch = useDispatch();

  const [, setSwordIconSrc] = useState(blackSwordSrc);

  const currentUserIsAdmin = useSelector((state) => currentUserIsAdminSelector(state));
  const currentUserId = useSelector(currentUserIdSelector);
  const { activeGames } = useSelector(lobbyDataSelector);

  const { isBot, canInvite, name, userId } = request.user;

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
  const handleFollow = useCallback(() => {
    dispatch(followUser(userId));
  }, [userId, dispatch]);

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
      pushCommand({ type: "ban", name, user_id: userId });
    }
  };

  return (
    <>
      {children}
      <Menu className="cb-bg-panel cb-border-color cb-rounded text-white" role="menu" id={menuId}>
        <Item role="menuitem" aria-label="Copy Name" onClick={handleCopy}>
          <FontAwesomeIcon className="mr-2 text-white" icon="copy" />
          <span className="text-white">Copy Name</span>
        </Item>
        <Item role="menuitem" aria-label="Info" onClick={handleShowInfo}>
          <FontAwesomeIcon className="mr-2 text-white" icon="user" />
          <span className="text-white">Info</span>
        </Item>
        {!isCurrentUser && (
          <Item role="menuitem" aria-label="Follow" onClick={handleFollow}>
            <FontAwesomeIcon className="mr-2 text-white" icon="binoculars" />
            <span className="text-white">Follow</span>
          </Item>
        )}
        {canCreatePrivateRoom ? (
          <Item
            role="menuitem"
            aria-label="Direct message"
            onClick={handleOpenDirect}
            disabled={!canCreatePrivateRoom}
          >
            <FontAwesomeIcon className="mr-2 text-white" icon="comment-alt" />
            <span className="text-white">Direct message</span>
          </Item>
        ) : null}
        {canInvite && (
          <Item
            role="menuitem"
            aria-label="Send an invite"
            onClick={handleCreateInviteModal}
            onMouseEnter={handleSelectInvateMenuItem}
            onMouseLeave={handleBlurInvateMenuItem}
            onFocus={handleSelectInvateMenuItem}
            onBlur={handleBlurInvateMenuItem}
            disabled={inviteSendDisabled}
          >
            <img
              alt="invite"
              src={whiteSwordSrc}
              style={{ width: 14, height: 16 }}
              className={cn("mr-2", {
                "text-muted": !inviteSendDisabled,
              })}
            />
            <span className="text-white">Send an invite</span>
          </Item>
        )}
        {currentUserIsAdmin ? (
          <>
            <Separator />
            <Item aria-label="Ban" onClick={handleBanClick} disabled={isBot}>
              <FontAwesomeIcon className="mr-2 text-white" icon="ban" />
              <span className="text-white">Ban</span>
            </Item>
          </>
        ) : null}
      </Menu>
    </>
  );
}

export default memo(ChatContextMenu);
