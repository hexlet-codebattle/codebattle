import React, { useState, useEffect, useMemo } from 'react';

import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import { useDispatch, useSelector } from 'react-redux';

import Placements from '../config/placements';
import * as selectors from '../selectors';
import { actions } from '../slices';

import PopoverStickOnHover from './PopoverStickOnHover';
import UserName from './UserName';
import UserStats from './UserStats';

function UserPopoverContent({ user }) {
  // TODO: store stats in global redux state
  const dispatch = useDispatch();

  const [stats, setStats] = useState(null);

  useEffect(() => {
    const userId = user.id;
    const controller = new AbortController();

    axios
      .get(`/api/v1/user/${userId}/stats`, {
        signal: controller.signal,
      })
      .then(response => {
        if (!controller.signal.aborted) {
          setStats(camelizeKeys(response.data));
        }
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });

    return () => {
      controller.abort();
    };
  }, [dispatch, setStats, user.id]);

  return <UserStats user={user} data={stats} />;
}

function UserInfo({
  className,
  user,
  banned = false,
  lang,
  hovered = false,
  hideLink = false,
  hideInfo = false,
  truncate = false,
  hideOnlineIndicator = false,
  loading = false,
  placement = Placements.bottomStart,
}) {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const isAdmin = useSelector(selectors.userIsAdminSelector(user?.id));
  const content = useMemo(() => <UserPopoverContent user={user} />, [user]);

  if (!user?.id) {
    return <span className="text-secondary">John Doe</span>;
  }

  if (user?.id === 0) {
    return <span className="text-secondary">{user.name}</span>;
  }

  const isOnline = presenceList.some(({ id }) => id === user?.id);
  const userClassName = cn(className, {
    'cb-opacity-50': loading,
    'text-danger': banned,
  });
  const linkClassName = cn(className, {
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
        isAdmin={isAdmin}
        isOnline={isOnline}
        hideOnlineIndicator={hideOnlineIndicator}
        hideLink={hideLink}
      />
    );
  }

  return (
    <PopoverStickOnHover
      id={`user-info-${user?.id}`}
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
          isAdmin={isAdmin}
          isOnline={isOnline}
          hideOnlineIndicator={hideOnlineIndicator}
          hideLink={hideLink}
        />
      </div>
    </PopoverStickOnHover>
  );
}

export default UserInfo;
