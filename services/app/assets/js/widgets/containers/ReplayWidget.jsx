import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { gameReplayPlayerSelector } from '../selectors';
import { actions } from '../slices';
import CodebattlePlayer from './CodebattlePlayer';

const ReplayWidget = () => {
  const dispatch = useDispatch();
  const { isShown } = useSelector(gameReplayPlayerSelector);

  const handleToggleReplay = () => {
    dispatch(actions.toggleGameSessionPlayer());
  };

  return (
    <div className="container my-1 position-absolute pl-0" style={{ bottom: 0 }}>
      <div className="d-flex justify-content-between align-item-center">
        <div className="btn-group flex-shrink-0 my-2">
          <button type="button" className="btn btn-sm btn-secondary disabled shadow-none">
            {' '}
            <FontAwesomeIcon icon="video" className="" size="lg" fixedWidth />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary shadow-none"
            onClick={handleToggleReplay}
          >
            Show replay
          </button>
        </div>
        {isShown && <CodebattlePlayer />}
      </div>
    </div>
  );
};

export default ReplayWidget;
