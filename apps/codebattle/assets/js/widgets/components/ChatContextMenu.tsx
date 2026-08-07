import React, { useState, useCallback, useMemo, memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import qs from 'qs';
import { Menu, Item, Separator } from 'react-contexify';
import { useSelector, useDispatch } from 'react-redux';

import i18n from '../../i18n';
import { pushCommand } from '@/middlewares/Chat';
import { openDirect } from '@/middlewares/Lobby';
import { followUser, unfollowUser } from '@/middlewares/Main';
import { currentUserIsAdminSelector, currentUserIdSelector, lobbyDataSelector } from '@/selectors';
import { actions } from '@/slices';
import { type RootState, type AppDispatch } from '@/slices/store';
import { getLobbyUrl, getUserProfileUrl } from '@/utils/urlBuilders';

const blackSwordSrc = '/assets/images/fight-black.png';
const whiteSwordSrc = '/assets/images/fight-white.png';

// react-contexify items sit on the dark `cb-bg-panel`; set white text inline
// (was Bootstrap `text-white`) so it beats the library's own item color rule.
const textStyle = { color: 'var(--mantine-color-white)' };
const iconStyle = { marginRight: 'var(--mantine-spacing-sm)', color: 'var(--mantine-color-white)' };

interface ChatContextMenuUser {
  name?: string | null;
  userId?: number | null;
  isBot?: boolean;
  canInvite?: boolean;
  githubName?: string;
}

interface ChatContextMenuRequest {
  user: ChatContextMenuUser;
}

interface ChatContextMenuProps {
  request?: ChatContextMenuRequest;
  menuId: string;
  inputRef: React.RefObject<HTMLInputElement>;
  children: React.ReactNode;
}

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
}: ChatContextMenuProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [, setSwordIconSrc] = useState(blackSwordSrc);

  const currentUserIsAdmin = useSelector((state: RootState) => currentUserIsAdminSelector(state));
  const currentUserId = useSelector(currentUserIdSelector);
  const { activeGames } = useSelector(lobbyDataSelector);

  const { isBot, canInvite, name, userId, githubName } = request.user;

  const isCurrentUserHasActiveGames = useMemo(
    () =>
      activeGames || (activeGames as unknown[]).length > 0
        ? activeGames.some(({ players }) => players.some(({ id }) => id === currentUserId))
        : true,
    [activeGames, currentUserId],
  );
  const isCurrentUser = !!userId && currentUserId === userId;
  const followId = useSelector((state: RootState) => state.gameUI.followId);
  const isFollowing = !!userId && followId === userId;

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
    if (!userId) {
      return;
    }

    if (isFollowing) {
      dispatch(unfollowUser(userId));
    } else {
      dispatch(followUser(userId, name ?? undefined));
    }
  }, [userId, name, isFollowing, dispatch]);

  const handleShowGithubProfile = useCallback(() => {
    window.open(`https://github.com/${githubName}`, '_blank');
  }, [githubName]);

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
      <Menu className="cb-bg-panel cb-border-color cb-rounded" role="menu" id={menuId}>
        <Item role="menuitem" tabIndex={-1} aria-label={i18n.t('Copy Name')} onClick={handleCopy}>
          <FontAwesomeIcon style={iconStyle} icon="copy" />
          <span style={textStyle}>{i18n.t('Copy Name')}</span>
        </Item>
        <Item role="menuitem" tabIndex={-1} aria-label={i18n.t('Info')} onClick={handleShowInfo}>
          <FontAwesomeIcon style={iconStyle} icon="user" />
          <span style={textStyle}>{i18n.t('Info')}</span>
        </Item>
        {githubName && (
          <Item
            role="menuitem"
            tabIndex={-1}
            aria-label={i18n.t('Github account')}
            onClick={handleShowGithubProfile}
          >
            <FontAwesomeIcon style={iconStyle} icon={['fab', 'github']} />
            <span style={textStyle}>{i18n.t('Github account')}</span>
          </Item>
        )}
        {!isCurrentUser && (
          <Item
            role="menuitem"
            tabIndex={-1}
            aria-label={i18n.t(isFollowing ? 'Unfollow' : 'Follow')}
            onClick={handleFollow}
          >
            <FontAwesomeIcon style={iconStyle} icon="binoculars" />
            <span style={textStyle}>{i18n.t(isFollowing ? 'Unfollow' : 'Follow')}</span>
          </Item>
        )}
        {canCreatePrivateRoom ? (
          <Item
            role="menuitem"
            aria-label={i18n.t('Direct message')}
            onClick={handleOpenDirect}
            disabled={!canCreatePrivateRoom}
          >
            <FontAwesomeIcon style={iconStyle} icon="comment-alt" />
            <span style={textStyle}>{i18n.t('Direct message')}</span>
          </Item>
        ) : null}
        {canInvite && (
          <Item
            role="menuitem"
            aria-label={i18n.t('Send an invite')}
            onClick={handleCreateInviteModal}
            onMouseEnter={handleSelectInvateMenuItem}
            onMouseLeave={handleBlurInvateMenuItem}
            onFocus={handleSelectInvateMenuItem}
            onBlur={handleBlurInvateMenuItem}
            disabled={inviteSendDisabled}
          >
            <img
              alt={i18n.t('Invite')}
              src={whiteSwordSrc}
              style={{ width: 14, height: 16, marginRight: 'var(--mantine-spacing-sm)' }}
            />
            <span style={textStyle}>{i18n.t('Send an invite')}</span>
          </Item>
        )}
        {currentUserIsAdmin && <Separator />}
        {currentUserIsAdmin && (
          <Item aria-label={i18n.t('Ban')} onClick={handleBanClick} disabled={isBot}>
            <FontAwesomeIcon style={iconStyle} icon="ban" />
            <span style={textStyle}>{i18n.t('Ban')}</span>
          </Item>
        )}
      </Menu>
    </>
  );
}

export default memo(ChatContextMenu);
