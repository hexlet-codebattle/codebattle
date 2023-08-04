import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { useDispatch } from 'react-redux';
import i18n from '../../../i18n';
import { actions } from '../../slices';
import ContributorsList from './ContributorsList';
import GameLevelBadge from '../../components/GameLevelBadge';
import TaskLanguagesSelection from './TaskLanguageSelection';
import TaskDescriptionMarkdown from './TaskDescriptionMarkdown';
import useTaskDescriptionParams from '../../utils/useTaskDescriptionParams';

const renderTaskLink = name => {
  const link = `https://github.com/hexlet-codebattle/battle_asserts/tree/master/src/battle_asserts/issues/${name}.clj`;

  return (
    <a href={link} className="d-inline-block">
      <span className="fab fa-github mr-1" />
      link
    </a>
  );
};

const ShowGuideButton = () => {
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
      Show guide
    </button>
  );
};

const TaskAssignment = ({ task, taskLanguage, handleSetLanguage }) => {
  const [avaibleLanguages, displayLanguage, description] = useTaskDescriptionParams(
    task,
    taskLanguage,
  );

  if (_.isEmpty(task)) {
    return null;
  }

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="px-3 py-3 h-100 overflow-auto" data-guide-id="Task">
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
            <ShowGuideButton />
          </div>
        </div>
        <div className="d-flex align-items-stretch flex-column">
          <div className="card-text mb-0 h-100 overflow-auto">
            <TaskDescriptionMarkdown description={description} />
          </div>
        </div>
        {task.origin === 'github' && (
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
};

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
