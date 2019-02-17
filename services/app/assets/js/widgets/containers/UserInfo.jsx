import { connect } from 'react-redux';
import React from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import UserName from '../components/UserName';
import UserStats from '../components/UserStats';
import { getUsersStats } from '../selectors';
import { loadUserStats } from '../middlewares/Users';

const UserInfo = ({ dispatch, user, usersStats }) => {
  const userStats = usersStats[user.id];
  const statsPopover = (
    <Popover title="Stats">
      <UserStats data={userStats} />
    </Popover>
  );

  const onEnter = () => (userStats ? null : loadUserStats(dispatch)(user));

  return (
    <OverlayTrigger
      trigger={['hover', 'focus']}
      placement="left"
      overlay={statsPopover}
      onEnter={onEnter}
      shouldUpdatePosition
    >
      <span>
        <UserName user={user} />
      </span>
    </OverlayTrigger>
  );
};

const mapStateToProps = state => ({
  usersStats: getUsersStats(state),
});

export default connect(mapStateToProps)(UserInfo);
