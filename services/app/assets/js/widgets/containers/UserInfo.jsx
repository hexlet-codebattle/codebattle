import { camelizeKeys } from 'humps';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { actions } from '../slices';
import UserName from '../components/User/UserName';
import UserStats from '../components/User/UserStats';
import PopoverStickOnHover from '../components/User/PopoverStickOnHover';

const UserPopoverContent = ({ user }) => {
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

const UserInfo = ({ user, truncate = false }) => (
  <PopoverStickOnHover id={`user-info-${user.id}`} placement="bottom-start" component={<UserPopoverContent user={user} />}>
    <div>
      <UserName user={user} truncate={truncate} />
    </div>
  </PopoverStickOnHover>
);

export default UserInfo;
