import React, { useEffect, useRef } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import {
  gameStatusSelector,
  gamePlayersSelector,
  currentUserIdSelector,
  executionOutputSelector,
} from '../selectors';

const OutputClicker = () => {
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
  const { checking } = useSelector(gameStatusSelector);
  const players = useSelector(gamePlayersSelector);
  const isCurrentUserPlayer = _.hasIn(players, currentUserId);
  const checkingResult = checking[currentUserId];
  const { status } = useSelector(executionOutputSelector(currentUserId));

  useEffect(() => {
    if (isCurrentUserPlayer && prevCheckingResult && !checkingResult) {
      document.getElementById('leftOutput-tab').click();
    }
  }, [checkingResult, isCurrentUserPlayer, prevCheckingResult, status]);

  return <></>;
};

export default OutputClicker;
