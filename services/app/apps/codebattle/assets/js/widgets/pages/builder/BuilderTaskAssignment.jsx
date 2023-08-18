import React, { useCallback } from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';
import isEmpty from 'lodash/isEmpty';
import capitalize from 'lodash/capitalize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import i18n from '../../../i18n';
import { actions } from '../../slices';
import * as selectors from '../../selectors';
import GameLevelBadge from '../../components/GameLevelBadge';
import TaskLanguagesSelection from '../game/TaskLanguageSelection';
import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';
import { validateTaskName } from '../../middlewares/Game';
import { taskStateCodes } from '../../config/task';
import useTaskDescriptionParams from '../../utils/useTaskDescriptionParams';

const defaultLevels = ['elementary', 'easy', 'medium', 'hard'].map(level => ({
  value: level,
  label: capitalize(level),
}));

const ConfigurationButton = ({ onClick }) => (
  <button
    type="button"
    className="btn btn-outline-secondary mr-1 btn-sm text-nowrap rounded-lg"
    onClick={onClick}
    data-toggle="tooltip"
    data-placement="top"
    title="Open task details"
  >
    <FontAwesomeIcon icon="cog" />
    <span className="ml-1">Details</span>
  </button>
);

const renderGameLevelSelectButton = (level, handleSetLevel) => (
  <div className="dropdown mr-1">
    <button
      type="button"
      title="level"
      className={cn('btn border-gray dropdown-toggle rounded-lg', {
        'p-0': level === 'hard' || level === 'medium',
        'p-1': level === 'elementary' || level === 'easy',
      })}
      data-toggle="dropdown"
      aria-expanded="false"
      data-offset="10,20"
    >
      <img alt={level} src={`/assets/images/levels/${level}.svg`} />
    </button>
    <div className="dropdown-menu">
      {defaultLevels.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-label={value}
          className={cn('dropdown-item', { active: value === level })}
          data-value={value}
          onClick={handleSetLevel}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

function BuilderTaskAssignment({
  task,
  taskLanguage,
  handleSetLanguage,
  openConfiguration,
}) {
  const dispatch = useDispatch();

  const editable = useSelector(selectors.canEditTask);
  const [avaibleLanguages, displayLanguage, description] = useTaskDescriptionParams(task, taskLanguage);
  const descriptionTextMapping = {
    en: task.descriptionEn,
    ru: task.descriptionRu,
  };
  const taskDescriptionText = descriptionTextMapping[taskLanguage];

  const handleSetLevel = useCallback(
    event => {
      const { value } = event.currentTarget.dataset;
      dispatch(actions.setTaskLevel({ level: value }));
    },
    [dispatch],
  );

  const handleSetDescription = useCallback(
    event => {
      dispatch(
        actions.setTaskDescription({
          lang: taskLanguage,
          value: event.target.value,
        }),
      );
    },
    [taskLanguage, dispatch],
  );

  const [validName, invalidNameReason] = useSelector(
    state => state.builder.validationStatuses.name,
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const validateName = useCallback(
    debounce(name => dispatch(validateTaskName(name)), 700),
    [],
  );

  const handleSetName = useCallback(
    event => {
      dispatch(actions.setTaskName({ name: event.target.value }));
      validateName(event.target.value);
    },
    [validateName, dispatch],
  );

  if (isEmpty(task)) {
    return null;
  }

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="px-3 py-3 h-100 overflow-auto">
        <div className="d-flex align-items-begin flex-column flex-sm-row justify-content-between">
          {editable ? (
            <div className="d-flex align-items-center mb-2">
              {renderGameLevelSelectButton(task.level, handleSetLevel)}
              <span className="h6 card-text mb-0 ml-2">{i18n.t('Task: ')}</span>
              {task.state === taskStateCodes.blank ? (
                <div className="position-relative">
                  <input
                    type="text"
                    className={cn(
                      'form-control form-control-sm rounded-lg ml-2',
                      {
                        'is-invalid': !validName && task.name.length > 0,
                      },
                    )}
                    placeholder="Enter name"
                    aria-label="Task Name"
                    aria-describedby="basic-addon1"
                    value={task.name}
                    onChange={handleSetName}
                  />
                  {!validName && task.name.length > 0 && (
                    <div className="invalid-tooltip ml-2">
                      {invalidNameReason}
                    </div>
                  )}
                </div>
              ) : (
                <span className="ml-2 text-muted">{task.name}</span>
              )}
            </div>
          ) : (
            <h6 className="card-text d-flex align-items-center mb-2">
              <GameLevelBadge level={task.level} />
              <span className="ml-2">{i18n.t('Task: ')}</span>
              <span className="ml-2 text-muted">{task.name}</span>
            </h6>
          )}
          <div className="d-flex align-items-center mb-2">
            <ConfigurationButton onClick={openConfiguration} />
            <TaskLanguagesSelection
              handleSetLanguage={handleSetLanguage}
              avaibleLanguages={avaibleLanguages}
              displayLanguage={displayLanguage}
            />
          </div>
        </div>
        <div className="d-flex align-items-stretch flex-column">
          <div className="card-text mb-0 h-100 overflow-auto">
            {editable ? (
              <>
                <p>
                  <strong>Description: </strong>
                </p>
                <textarea
                  className="form-control form-control-sm rounded-lg"
                  id={`description-${taskLanguage}`}
                  rows={5}
                  value={taskDescriptionText}
                  onChange={handleSetDescription}
                />
              </>
            ) : (
              <TaskDescriptionMarkdown description={description} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

BuilderTaskAssignment.propTypes = {
  task: PropTypes.shape({
    name: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
    examples: PropTypes.string,
    descriptionEn: PropTypes.string,
    descriptionRu: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  taskLanguage: PropTypes.string.isRequired,
};

export default BuilderTaskAssignment;
