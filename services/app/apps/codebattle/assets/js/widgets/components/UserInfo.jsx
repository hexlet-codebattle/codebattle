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
  const [stats, setStats] = useState(null);
  const dispatch = useDispatch();

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
  hideInfo = false,
  truncate = false,
  hideOnlineIndicator = false,
  loading = false,
  placement = Placements.bottomStart,
}) {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
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
  });

  if (hideInfo) {
    return (
      <UserName
        className={userClassName}
        user={user}
        truncate={truncate}
        isOnline={isOnline}
        hideOnlineIndicator={hideOnlineIndicator}
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
          user={user}
          truncate={truncate}
          isOnline={isOnline}
          hideOnlineIndicator={hideOnlineIndicator}
        />
      </div>
    </PopoverStickOnHover>
  );
}

export default UserInfo;
