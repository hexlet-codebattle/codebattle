import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { camelizeKeys } from 'humps';
import cn from 'classnames';
import axios from 'axios';

import * as selectors from '../selectors';
import { actions } from '../slices';
import UserName from '../components/User/UserName';
import UserStats from '../components/User/UserStats';
import PopoverStickOnHover from '../components/User/PopoverStickOnHover';

const UserPopoverContent = ({ user }) => {
  // TODO: store stats in global redux state
  const [stats, setStats] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const userId = user.id;
    axios
      .get(`/api/v1/user/${userId}/stats`)
      .then(response => {
        setStats(camelizeKeys(response.data));
      })
      .catch(error => {
        dispatch(actions.setError(error));
      });
  }, [dispatch, setStats, user.id]);

  return <UserStats user={user} data={stats} />;
};

const UserInfo = ({
 user, truncate = false, hideOnlineIndicator = false, loading = false,
}) => {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  if (!user?.id) {
    return <span className="text-secondary">No-User</span>;
  }

  if (user?.id === 0) {
    return <span className="text-secondary">{`${user.name}`}</span>;
  }

  const isOnline = presenceList.some(({ id }) => id === user?.id);
  const userClassName = cn({ 'cb-opacity-50': loading });

  return (
    <PopoverStickOnHover
      id={`user-info-${user?.id}`}
      placement="bottom-start"
      component={<UserPopoverContent user={user} />}
    >
      <div className={userClassName}>
        <UserName
          user={user}
          truncate={truncate}
          isOnline={isOnline}
          hideOnlineIndicator={hideOnlineIndicator}
        />
      </div>
    </PopoverStickOnHover>
  );
};

export default UserInfo;
