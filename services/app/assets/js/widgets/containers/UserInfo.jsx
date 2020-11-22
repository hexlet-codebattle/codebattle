// @ts-check
// import { useSelector, useDispatch } from 'react-redux';
import React from 'react';
// import { OverlayTrigger, Popover } from 'react-bootstrap';
// import cn from 'classnames';
import UserName from '../components/User/UserName';
// import UserStats from '../components/User/UserStats';
// import { getUsersStats } from '../selectors';
// import { loadUserStats } from '../middlewares/Users';

// const UserInfo = ({ user }) => {
//   const usersStats = useSelector(state => getUsersStats(state));
//   const userStats = usersStats[user.id];
//   const dispatch = useDispatch();
//   const popoverID = `popover-userInfo-${user.id}`;

//   const statsPopover = ({ show, ...rest }) => (
//     <Popover className={cn({ 'd-none': !userStats })} id={popoverID} {...rest}>
//       <Popover.Title as="h3">{user.name}</Popover.Title>
//       {userStats && (
//         <Popover.Content>
//           <UserStats data={userStats} />
//         </Popover.Content>
//       )}
//     </Popover>
//   );

//   const onEnter = () => !userStats && dispatch(loadUserStats)(user);

//   return (
//     <OverlayTrigger
//       trigger={['hover', 'focus']}
//       placement="left"
//       overlay={statsPopover}
//       onEnter={onEnter}
//     >
//       <span>
//         <UserName user={user} />
//       </span>
//     </OverlayTrigger>
//   );
// }

const UserInfo = ({ user, truncate = false }) => (
  <UserName user={user} truncate={truncate} />
);

export default UserInfo;
