import React, { useEffect, useRef } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import {
  gameStatusSelector,
  gamePlayersSelector,
  currentUserIdSelector,
} from '../selectors';

const NotificationsHandler = () => {
  const currentUserId = useSelector(currentUserIdSelector);

  const usePrevious = () => {
    const ref = useRef();
    const gameStatus = useSelector(gameStatusSelector);
    useEffect(() => {
      ref.current = gameStatus.checking[currentUserId];
    });
    return ref.current;
  };

  const prevCheckingResult = usePrevious();
  const { solutionStatus, checking } = useSelector(gameStatusSelector);
  const players = useSelector(gamePlayersSelector);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const checkingResult = checking[currentUserId];

  useEffect(() => {
    if (isCurrentUserPlayer && prevCheckingResult && !checkingResult) {
     document.getElementById('leftOutput-tab').click();
    }
  }, [checkingResult, isCurrentUserPlayer, prevCheckingResult, solutionStatus]);

  return <></>;
};

export default NotificationsHandler;
