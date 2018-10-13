import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactMarkdown from 'react-markdown';
import i18n from '../../i18n';

const renderGameLevelBadge = (level) => {
  const levels = {
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };

  return <h4 className="m-0 p-0"><span className={`badge badge-${levels[level]}`}>{level}</span></h4>;
};

const Task = ({ task }) =>
  (_.isEmpty(task) ? null : (
    <div className="card">
      <div className="d-flex align-items-center py-0 my-0 justify-content-between card-header font-weight-bold">
        <div className="p-1" >
          {`Task: ${task.name}`}
        </div>
        <div className="p-1">
          {renderGameLevelBadge(task.level)}
        </div>
      </div>
      <div className="card-body py-1 mb-0">
        <ReactMarkdown
          className="card-text"
          source={task.description}
        />
      </div>
    </div>
  ));

Task.propTypes = {
  task: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
  }).isRequired,
};

export default Task;
