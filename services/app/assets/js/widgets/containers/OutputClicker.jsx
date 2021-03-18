import React, { useEffect, useRef } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import {
  gameStatusSelector,
  gamePlayersSelector,
  currentUserIdSelector,
  executionOutputSelector,
} from '../selectors';
import GameContext from './GameContext';

const OutputClicker = () => {
  const { current: gameCurrent } = useContext(GameContext);
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
  const executionOutput = useSelector(executionOutputSelector(gameCurrent, currentUserId));

  useEffect(() => {
    if (isCurrentUserPlayer && prevCheckingResult && !checkingResult) {
      document.getElementById('leftOutput-tab').click();
    }
  }, [checkingResult, isCurrentUserPlayer, prevCheckingResult, executionOutput]);

  return <></>;
};

export default OutputClicker;
