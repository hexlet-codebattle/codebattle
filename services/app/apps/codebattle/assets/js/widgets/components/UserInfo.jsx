import React, { useState, useEffect, useMemo } from 'react';

import axios from 'axios';
import cn from 'classnames';
import { camelizeKeys } from 'humps';
import { useDispatch, useSelector } from 'react-redux';

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
      .then((response) => {
        if (!controller.signal.aborted) {
          setStats(camelizeKeys(response.data));
        }
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });

    return () => {
      controller.abort();
    };
  }, [dispatch, setStats, user.id]);

  return <UserStats data={stats} user={user} />;
}

function UserInfo({
  hideInfo = false,
  hideOnlineIndicator = false,
  loading = false,
  truncate = false,
  user,
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
  const userClassName = cn({ 'cb-opacity-50': loading });

  if (hideInfo) {
    return (
      <div className={userClassName}>
        <UserName
          hideOnlineIndicator={hideOnlineIndicator}
          isOnline={isOnline}
          truncate={truncate}
          user={user}
        />
      </div>
    );
  }

  return (
    <PopoverStickOnHover component={content} id={`user-info-${user?.id}`} placement="bottom-start">
      <div className={userClassName}>
        <UserName
          hideOnlineIndicator={hideOnlineIndicator}
          isOnline={isOnline}
          truncate={truncate}
          user={user}
        />
      </div>
    </PopoverStickOnHover>
  );
}

export default UserInfo;
