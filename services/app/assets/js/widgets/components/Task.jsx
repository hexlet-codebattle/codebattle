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
    <small>
      <span className={`badge badge-pill badge-${levels[level]} mr-1`}>&nbsp;</span>
      {level}
    </small>
  );
};

const renderTimer = (time, gameStatusName) => {
  if (gameStatusName !== GameStatusCodes.gameOver) {
    return <Timer time={time} />;
  }

  return <div><p>{gameStatusName}</p></div>;
};

const Task = ({ task, time, gameStatusName }) => {
  if (_.isEmpty(task)) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">Task</div>
      <div className="card-body">
        <h5 className="card-title mb-4">
          {task.name}
          <small className="ml-2">{renderGameLevelBadge(task.level)}</small>
        </h5>
        <ReactMarkdown
          className="card-text"
          source={task.description}
        />
      </div>
      <div className="card-footer text-muted">
        {renderTimer(time, gameStatusName)}
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
