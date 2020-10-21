import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { replayIsShownSelector } from '../selectors';
import { actions } from '../slices';
import CodebattlePlayer from './CodebattlePlayer';

const ReplayWidget = () => {
  const dispatch = useDispatch();
  const replayIsShown = useSelector(replayIsShownSelector);

  const handleToggleReplay = () => {
    dispatch(actions.togglePlayer());
  };

  return (
    <div>
      <button type="button" className="btn" onClick={handleToggleReplay}>
        <span aria-label="player" role="img">
          ⏯️
        </span>
      </button>
      {replayIsShown && <CodebattlePlayer />}
    </div>
  );
};

export default ReplayWidget;
