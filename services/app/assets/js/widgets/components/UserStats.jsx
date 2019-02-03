import React from 'react';
import Loading from './Loading';

const UserStats = ({ stats }) => {
  if (stats) {
    return (
      <div>
        Won:
        <b className="text-success">{stats.won}</b>
        <br />
        Lost:
        <b className="text-danger">{stats.lost}</b>
        <br />
        Gave up:
        <b className="text-warning">{stats.gave_up}</b>
      </div>
    );
  }

  return <Loading small />;
};

export default UserStats;
