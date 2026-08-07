import React, { useState, useEffect, useMemo } from 'react';

import cn from 'classnames';
import { camelizeKeys } from 'humps';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch } from '@/slices/store';

import Placements from '../config/placements';
import * as selectors from '../selectors';
import { actions } from '../slices';

import PopoverStickOnHover, { type Placement } from './PopoverStickOnHover';
import UserName, { type UserNameUser } from './UserName';
import UserStats from './UserStats';

interface UserPopoverContentProps {
  user: UserNameUser;
}

type UserStatsData = React.ComponentProps<typeof UserStats>['data'];

const userStatsCache = new Map<UserNameUser['id'], UserStatsData>();
const userStatsRequests = new Map<UserNameUser['id'], Promise<UserStatsData>>();

const fetchUserStats = (userId: UserNameUser['id']) => {
  const cached = userStatsCache.get(userId);

  if (cached) {
    return Promise.resolve(cached);
  }

  const pendingRequest = userStatsRequests.get(userId);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = fetch(`/api/v1/user/${userId}/achievements`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return camelizeKeys(await response.json()) as UserStatsData;
    })
    .then((data) => {
      userStatsCache.set(userId, data);
      return data;
    })
    .finally(() => {
      userStatsRequests.delete(userId);
    });

  userStatsRequests.set(userId, request);
  return request;
};

function UserPopoverContent({ user }: UserPopoverContentProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [stats, setStats] = useState<UserStatsData>(() => userStatsCache.get(user.id));

  useEffect(() => {
    const userId = user.id;
    let mounted = true;

    setStats(userStatsCache.get(userId));
    fetchUserStats(userId)
      .then((data) => {
        if (mounted) {
          setStats(data);
        }
      })
      .catch((error) => {
        if (mounted) {
          dispatch(actions.setError(error));
        }
      });

    return () => {
      mounted = false;
    };
  }, [dispatch, user.id]);

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
  placement?: Placement;
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
  placement = Placements.bottomStart as Placement,
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
    <PopoverStickOnHover
      id={`user-info-${user?.id}`}
      delay={150}
      placement={placement}
      component={content}
    >
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
