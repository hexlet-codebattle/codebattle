import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector } from 'react-redux';
import React, { useEffect, useState } from 'react';
import cn from 'classnames';

import GameStatusCodes from '../../config/gameStatusCodes';
import * as selectors from '../../selectors';

const TypingIcon = ({ editor }) => {
  const { text } = editor;
  const [showTyping, setShowTyping] = useState(true);

  const gameStatus = useSelector(state => selectors.gameStatusSelector(state));
  const isStoredGame = gameStatus.status === GameStatusCodes.stored;

  useEffect(() => {
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
    }, 500);
  }, [text]);

  const classNames = cn('text-info mx-3', {
    'd-none': isStoredGame || !showTyping,
  });

  return (
    <div>
      <FontAwesomeIcon icon="keyboard" className={classNames} />
    </div>
  );
};

export default TypingIcon;
