import React from 'react';
// import _ from 'lodash';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18n from '../../../i18n';
import LanguageIcon from '../LanguageIcon';

const renderUserName = ({ id, name, rank }) => {
  if (id < 0) {
    return i18n.t('%{name}(bot)', { name });
  }

  return `${name}(${rank})`;
};
const renderOnlineIndicator = (user, isOnline) => {
  if (user.id <= 0) {
    return null;
  }

  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-offline': !isOnline,
  });

  return (
    <span>
      <FontAwesomeIcon
        icon={['fa', 'circle']}
        className={onlineIndicatorClassName}
      />
    </span>
  );
};

const UserName = ({ user, truncate, isOnline }) => (
  <div className="d-flex align-items-baseline">
    {renderOnlineIndicator(user, isOnline)}
    <span className="d-flex align-items-center">
      <a
        href={`/users/${user.id}`}
        key={user.id}
        className="d-flex align-items-center mr-1"
      >
        <span
          className={`text-truncate ${
              truncate ? 'x-username-truncated' : ''
            }`}
        >
          <u>{renderUserName(user)}</u>
        </span>
      </a>
      <LanguageIcon lang={user.lang || 'js'} />
    </span>
  </div>
  );

export default UserName;
