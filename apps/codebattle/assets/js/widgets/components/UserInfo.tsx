import React, { useState, useEffect, useMemo } from 'react';

import cn from 'classnames';
import { camelizeKeys } from 'humps';
import { useDispatch, useSelector } from 'react-redux';

import type { OverlayProps } from 'react-bootstrap/Overlay';

import type { AppDispatch } from '@/slices/store';

import Placements from '../config/placements';
import * as selectors from '../selectors';
import { actions } from '../slices';

import PopoverStickOnHover from './PopoverStickOnHover';
import UserName, { type UserNameUser } from './UserName';
import UserStats from './UserStats';

interface UserPopoverContentProps {
  user: UserNameUser;
}

function UserPopoverContent({ user }: UserPopoverContentProps) {
  // TODO: store stats in global redux state
  const dispatch = useDispatch<AppDispatch>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const userId = user.id;
    const controller = new AbortController();

    fetch(`/api/v1/user/${userId}/achievements`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setStats(camelizeKeys(data));
        }
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });

    return () => {
      controller.abort();
    };
  }, [dispatch, setStats, user.id]);

  // UserStats expects a stricter user shape (numeric id); UserNameUser is broader.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <UserStats user={user as any} data={stats} />;
}

interface UserInfoProps {
  className?: string;
  linkClassName?: string;
  user: UserNameUser;
  banned?: boolean;
  lang?: string;
  hovered?: boolean;
  hideLink?: boolean;
  hideInfo?: boolean;
  truncate?: boolean;
  hideOnlineIndicator?: boolean;
  hideRank?: boolean;
  displayName?: string;
  loading?: boolean;
  placement?: OverlayProps['placement'];
}

function UserInfo({
  className,
  linkClassName: linkClassNameProp,
  user,
  banned = false,
  lang,
  hovered = false,
  hideLink = false,
  hideInfo = false,
  truncate = false,
  hideOnlineIndicator = false,
  displayName,
  loading = false,
  placement = Placements.bottomStart as OverlayProps['placement'],
}: UserInfoProps) {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const content = useMemo(() => (user.isBot ? 'bot' : <UserPopoverContent user={user} />), [user]);

  if (!user?.id) {
    return <span className="text-white">John Doe</span>;
  }

  if (user?.id === 0) {
    return <span className="text-white">{user.name}</span>;
  }

  const isOnline = (presenceList as Array<{ id?: string | number }>).some(
    (presence) => presence.id === user?.id,
  );
  const userClassName = cn(className, {
    'cb-opacity-50': loading,
    'text-danger': banned,
  });
  const linkClassName = linkClassNameProp
    ? cn(linkClassNameProp, { 'text-danger': banned })
    : cn(className, {
        'text-white': !banned,
        'text-danger': banned,
      });

  if (hideInfo) {
    return (
      <UserName
        className={userClassName}
        linkClassName={linkClassName}
        hovered={hovered}
        user={user}
        lang={lang}
        truncate={truncate}
        isOnline={isOnline}
        hideOnlineIndicator={hideOnlineIndicator}
        hideLink={hideLink}
        displayName={displayName}
      />
    );
  }

  return (
    <PopoverStickOnHover id={`user-info-${user?.id}`} placement={placement} component={content}>
      <div>
        <UserName
          className={userClassName}
          linkClassName={linkClassName}
          hovered={hovered}
          user={user}
          lang={lang}
          truncate={truncate}
          isOnline={isOnline}
          hideOnlineIndicator={hideOnlineIndicator}
          hideLink={hideLink}
          displayName={displayName}
        />
      </div>
    </PopoverStickOnHover>
  );
}

export default UserInfo;
