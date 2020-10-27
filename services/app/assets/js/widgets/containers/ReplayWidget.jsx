import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { gameReplayPlayerSelector, gameSessionStatusSelector } from '../selectors';
import { actions } from '../slices';
import CodebattlePlayer from './CodebattlePlayer';
import GameSessionStatusCodes from '../config/gameSessionStatusCodes';

const ReplayWidget = () => {
  const dispatch = useDispatch();
  const { isShown } = useSelector(gameReplayPlayerSelector);
  const status = useSelector(gameSessionStatusSelector);

  const isRecord = status === GameSessionStatusCodes.recorded;

  const handleToggleReplay = () => {
    dispatch(actions.toggleGameSessionPlayer());
  };

  const classnames = cn({
    container: true,
    'd-none': !isRecord,
    'my-1': true,
    'pl-0': true,
    'position-absolute': true,
  });

  return (
    <div className={classnames} style={{ bottom: 0 }}>
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
            Watch replay
          </button>
        </div>
        {isShown && <CodebattlePlayer />}
      </div>
    </div>
  );
};

export default ReplayWidget;
