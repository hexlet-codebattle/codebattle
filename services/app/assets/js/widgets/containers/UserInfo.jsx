import { connect } from 'react-redux';
import React from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import cn from 'classnames';
import UserName from '../components/UserName';
import UserStats from '../components/UserStats';
import { getUsersStats } from '../selectors';
import { loadUserStats } from '../middlewares/Users';

const UserInfo = ({ dispatch, user, usersStats }) => {
  const userStats = usersStats[user.id];
  const statsPopover = ({ show, ...rest }) => (
    <Popover className={cn({ 'd-none': !userStats })} {...rest}>
      <Popover.Title as="h3">{user.name}</Popover.Title>
      {userStats && (
        <Popover.Content>
          <UserStats data={userStats} />
        </Popover.Content>
      )}
    </Popover>
  );

  const onEnter = () => !userStats && dispatch(loadUserStats)(user);

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
