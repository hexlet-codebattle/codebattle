import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import cn from 'classnames';

const TypingIcon = ({ editor }) => {
  const { text } = editor;
  const [showTyping, setShowTyping] = useState(true);

  useEffect(() => {
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
    }, 500);
  }, [text]);

  const classNames = cn('text-info mx-3', {
    'd-none': !showTyping,
  });

  return (
    <div>
      <FontAwesomeIcon icon="keyboard" className={classNames} />
    </div>
  );
};

export default TypingIcon;
