import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactMarkdown from 'react-markdown';
import i18n from '../../i18n';
import Timer from './Timer';
import CountdownTimer from './CountdownTimer';
import GameStatusCodes from '../config/gameStatusCodes';
import ContributorsList from './ContributorsList';

const renderTaskLink = name => {
  const link = `https://github.com/hexlet-codebattle/battle_asserts/tree/master/src/battle_asserts/issues/${name}.clj`;

  return (
    <a href={link} className="d-inline-block">
      <span className="fab fa-github mr-1" />
      link
    </a>
  );
};

const renderGameLevelBadge = level => (
  <div
    className="text-center mr-2"
    data-toggle="tooltip"
    data-placement="right"
    title={level}
  >
    <img alt={level} src={`/assets/images/levels/${level}.svg`} />
  </div>
);

const renderTimer = (time, timeoutSeconds, gameStatusName) => {
  if (
    gameStatusName === GameStatusCodes.gameOver
    || gameStatusName === GameStatusCodes.timeout
  ) {
    return gameStatusName;
  }

  if (timeoutSeconds) {
    return <CountdownTimer time={time} timeoutSeconds={timeoutSeconds} />;
  }

  return <Timer time={time} />;
};

const Task = ({
 task, time, gameStatusName, timeoutSeconds,
}) => {
  if (_.isEmpty(task)) {
    return null;
  }
  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="px-3 py-3 h-100 overflow-auto" data-guide-id="Task">
        <div className="d-flex align-items-begin flex-column flex-sm-row justify-content-between">
          <h6 className="card-text d-flex align-items-center">
            {renderGameLevelBadge(task.level)}
            <div>
              {i18n.t('Task: ')}
              <span className="card-subtitle mb-2 text-muted">{task.name}</span>
            </div>
          </h6>
          <div className="card-text">
            {time && renderTimer(time, timeoutSeconds, gameStatusName)}
          </div>
        </div>
        <div className="d-flex align-items-stretch flex-column">
          <div className="card-text mb-0  h-100  overflow-auto">
            <ReactMarkdown
              source={task.description}
              renderers={{
                linkReference: reference => {
                  if (!reference.href) {
                    return (
                      <>
                        [
                        {reference.children}
                        ]
                      </>
);
                  }
                  return <a href={reference.$ref}>{reference.children}</a>;
                },
              }}
            />
          </div>
        </div>
        <ContributorsList name={task.name} />
        <div className="d-flex align-items-end flex-column flex-sm-row justify-content-between">
          <h6 className="card-text small font-italic text-black-50">
            <span className="mr-2">
              {i18n.t(
                'Found a mistake? Have something to add? Pull Requests are welcome: ',
              )}
            </span>
            {renderTaskLink(task.name)}
          </h6>
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
