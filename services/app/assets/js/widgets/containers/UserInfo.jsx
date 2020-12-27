import { camelizeKeys } from 'humps';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Popover, OverlayTrigger } from 'react-bootstrap';

import { actions } from '../slices';
import UserName from '../components/User/UserName';

const UserStats = ({ user, data }) => (
  <div className="popover">
    <div className="popover-info">
      <div className="popover-info-top">
        <span>{user.name}</span>
      </div>
      <div className="popover-info-body">
        <span>
          Rank:
          {data.rank}
        </span>
        <span>
          Rating:
          {data.user.rating}
        </span>
        <span>
          Games:
          {data.completedGames.length}
        </span>
        <span>
          Won:
          {data.stats.won}
        </span>
        <span>
          Lost:
          {data.stats.lost}
        </span>
        <span>
          GaveUp:
          {data.stats.gaveUp}
        </span>
      </div>
    </div>
  </div>
);

const CustomOverlay = ({ user, overLayProps }) => {
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

  return (
    <Popover {...overLayProps} id="popover-user">
      {!stats ? '' : <UserStats user={user} data={stats} />}
    </Popover>
  );
};

const UserInfo = ({ user, truncate = false }) => (
  <OverlayTrigger placement="bottom" delay={1000} overlay={props => <CustomOverlay user={user} overLayProps={props} />}>
    <div><UserName user={user} truncate={truncate} /></div>
  </OverlayTrigger>
);

export default UserInfo;
