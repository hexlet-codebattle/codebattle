import React, { useCallback } from 'react';

import NiceModal from '@ebay/nice-modal-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import isEmpty from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import GameLevelBadge from '../../components/GameLevelBadge';
import ModalCodes from '../../config/modalCodes';
import PageNames from '../../config/pageNames';
import { actions } from '../../slices';
import useTaskDescriptionParams from '../../utils/useTaskDescriptionParams';

import ContributorsList from './ContributorsList';
import TaskDescriptionMarkdown from './TaskDescriptionMarkdown';
import TaskLanguagesSelection from './TaskLanguageSelection';

const renderTaskLink = name => {
  const link = `https://github.com/hexlet-codebattle/battle_asserts/tree/master/src/battle_asserts/issues/${name}.clj`;

  return (
    <a href={link} className="d-inline-block">
      <span className="fab fa-github mr-1" />
      link
    </a>
  );
};

function ShowGuideButton() {
  const dispatch = useDispatch();
  const guideShow = () => {
    dispatch(actions.updateGameUI({ isShowGuide: true }));
  };

  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm mx-2 text-nowrap rounded-lg"
      onClick={guideShow}
      data-toggle="tooltip"
      data-placement="top"
      title="Show guide"
    >
      {i18n.t('Show guide')}
    </button>
  );
}

function TaskAssignment({
  task,
  taskLanguage,
  taskSize = 0,
  handleSetLanguage,
  changeTaskDescriptionSizes,
  hideGuide = false,
  hideContribution = false,
  hideContent = false,
  hidingControls = false,
  fullSize = false,
}) {
  const [avaibleLanguages, displayLanguage, description] = useTaskDescriptionParams(task, taskLanguage);

  const handleTaskSizeIncrease = useCallback(() => {
    changeTaskDescriptionSizes(taskSize + 1);
  }, [taskSize, changeTaskDescriptionSizes]);

  const handleTaskSizeDecrease = useCallback(() => {
    changeTaskDescriptionSizes(taskSize - 1);
  }, [taskSize, changeTaskDescriptionSizes]);
  const handleOpenFullSizeTaskDescription = useCallback(() => {
    NiceModal.show(ModalCodes.taskDescriptionModal, { pageName: PageNames.game });
  }, []);

  if (isEmpty(task)) {
    return null;
  }

  const cardClassName = cn({
    'card h-100 border-0 shadow-sm': !fullSize,
    h5: taskSize === 1,
    h4: taskSize === 2,
    h3: taskSize === 3,
    h2: taskSize === 4,
    h1: taskSize > 4,
  });

  if (hideContent) {
    return (
      <div className={cardClassName}>
        <div className="d-flex justify-content-center align-items-center h-100">
          <span>Only for Premium subscribers</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClassName}>
      <div className="px-3 py-3 h-100 overflow-auto" data-guide-id={!fullSize && 'Task'}>
        <div className="d-flex align-items-begin flex-column flex-sm-row justify-content-between">
          <h6 className="card-text d-flex align-items-center">
            <GameLevelBadge level={task.level} />
            <span className="ml-2">{i18n.t('Task: ')}</span>
            <span className="ml-2 text-muted">{task.name}</span>
          </h6>
          <div className="d-flex align-items-center">
            <TaskLanguagesSelection
              handleSetLanguage={handleSetLanguage}
              avaibleLanguages={avaibleLanguages}
              displayLanguage={displayLanguage}
            />

            {!fullSize && (
              <button
                type="button"
                className="btn btn-outline-secondary rounded-lg ml-2"
                onClick={handleOpenFullSizeTaskDescription}
              >
                <FontAwesomeIcon icon="expand" />
              </button>
            )}
            {!hideGuide && <ShowGuideButton />}
            {changeTaskDescriptionSizes && !hidingControls && (
              <div
                className="btn-group align-items-center ml-2 mr-auto"
                role="group"
                aria-label="Editor size controls"
              >
                <button type="button" className="btn btn-sm btn-light rounded-left" onClick={handleTaskSizeDecrease}>
                  -
                </button>
                <button type="button" className="btn btn-sm mr-2 btn-light border-left rounded-right" onClick={handleTaskSizeIncrease}>
                  +
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="d-flex align-items-stretch flex-column user-select-none">
          <div className="card-text mb-0 h-100 overflow-auto user-select-none">
            <TaskDescriptionMarkdown description={description} />
          </div>
        </div>
        {task.origin === 'github' && !hideContribution && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

TaskAssignment.propTypes = {
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

export default TaskAssignment;
