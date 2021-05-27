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

  const displayRank = rank ? `(${rank})` : '';

  return `${name}${displayRank}`;
};
const renderOnlineIndicator = (user, isOnline) => {
  if (user.id <= 0) {
    return null;
  }

  const onlineIndicatorClassName = cn('mr-2', {
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

const UserName = ({
  user, truncate, isOnline, hideOnlineIndicator,
}) => (
  <div className="d-flex align-items-baseline">
    {!hideOnlineIndicator && renderOnlineIndicator(user, isOnline)}
    <span className="d-flex align-items-center">
      <LanguageIcon lang={user.lang || 'js'} />
      <a
        href={`/users/${user.id}`}
        key={user.id}
        className="d-flex align-items-center"
      >
        <span
          className={`text-truncate ${
              truncate ? 'x-username-truncated' : ''
            }`}
        >
          <u>{renderUserName(user)}</u>
        </span>
      </a>
    </span>
  </div>
  );

export default UserName;
