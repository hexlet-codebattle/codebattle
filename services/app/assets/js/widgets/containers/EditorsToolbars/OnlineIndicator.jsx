import { useSelector } from 'react-redux';
import React from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { chatUsersSelector } from '../../selectors';

export default ({ player }) => {
  const onlineUsers = useSelector(state => chatUsersSelector(state));
  const isOnline = _.find(onlineUsers, { id: player.id });

  const icon = isOnline ? 'user' : 'user-slash';
  const color = isOnline ? 'green' : 'red';

  return <FontAwesomeIcon className="mx-2" icon={icon} color={color} fixedWidth />;
};
