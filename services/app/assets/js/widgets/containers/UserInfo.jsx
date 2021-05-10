import { camelizeKeys } from 'humps';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Popover, OverlayTrigger } from 'react-bootstrap';

import { actions } from '../slices';
import UserName from '../components/User/UserName';

const getUserAvatarUrl = ({ githubId, discordId, discordAvatar }) => {
  if (githubId) {
    return `https://avatars0.githubusercontent.com/u/${githubId}`;
  }

  if (discordId) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}`;
  }

  return 'https://avatars0.githubusercontent.com/u/35539033';
};

const UserStats = ({ user, data }) => (
  <div className="container-fluid p-2">
    <div className="row">
      <div className="col d-flex flex-row align-items-center">
        <img
          className="img-fluid"
          style={{
            maxHeight: '35px',
            width: '35px',
          }}
          src={getUserAvatarUrl(data.user)}
          alt={data.user.name}
        />
        <span>{user.name}</span>
      </div>
    </div>
    <div className="row">
      <div className="col d-flex justify-content-between">
        <div>
          <span>Rank:</span>
          {data.rank}
        </div>
        <div className="ml-1">
          <span>Rating:</span>
          {data.user.rating}
        </div>
        <div className="ml-1">
          <span>Games:</span>
          {data.completedGames.length}
        </div>
      </div>
    </div>
    <div className="row">
      <div className="col d-flex justify-content-between">
        <div>
          <span>Won:</span>
          {data.stats.won}
        </div>
        <div className="ml-1">
          <span>Lost:</span>
          {data.stats.lost}
        </div>
        <div className="ml-1">
          <span>GaveUp:</span>
          {data.stats.gaveUp}
        </div>
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
  <OverlayTrigger
    placement="bottom"
    delay={100}
    overlay={props => <CustomOverlay user={user} overLayProps={props} />}
  >
    <div>
      <UserName user={user} truncate={truncate} />
    </div>
  </OverlayTrigger>
);

export default UserInfo;
