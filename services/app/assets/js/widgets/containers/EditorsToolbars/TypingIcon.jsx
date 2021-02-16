import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import cn from 'classnames';

const TypingIcon = ({ status }) => {
  const classNames = cn('text-info mx-3', {
    'd-none': status !== 'typing',
  });

  return (
    <div>
      <FontAwesomeIcon icon="keyboard" className={classNames} />
    </div>
  );
};

export default TypingIcon;
