import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactMarkdown from 'react-markdown';
// import i18n from '../../i18n';
import Timer from './Timer';
import GameStatusCodes from '../config/gameStatusCodes';

const renderGameLevelBadge = (level) => {
  const levels = {
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };

  return (
    <small className="ml-2">
      <span className={`badge badge-pill badge-${levels[level]} mr-1`}>&nbsp;</span>
      {level}
    </small>
  );
};

const renderTimer = (time, gameStatusName) => {
  if (gameStatusName !== GameStatusCodes.gameOver && gameStatusName !== GameStatusCodes.timeout) {
    return <Timer time={time} />;
  }

  return gameStatusName;
};

const Task = ({ task, time, gameStatusName }) => {
  if (_.isEmpty(task)) {
    return null;
  }

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="px-3 py-3">
        <div className="d-flex flex-column flex-sm-row justify-content-between">
          <h6 className="card-text">
            {'Task: '}
            <span className="card-subtitle mb-2 text-muted">{task.name}</span>
            {renderGameLevelBadge(task.level)}
          </h6>
          <div className="card-text">
            <span className="text-muted">{renderTimer(time, gameStatusName)}</span>
          </div>
        </div>
        <div className="card-text mb-0">
          <ReactMarkdown source={task.description} />
        </div>
      </div>
    </div>
  );
};

Task.propTypes = {
  task: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
  }).isRequired,
};

export default Task;
