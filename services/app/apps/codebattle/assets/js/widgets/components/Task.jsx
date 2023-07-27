import React, { useContext, useCallback } from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactMarkdown from 'react-markdown';
import { Dropdown } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import i18n from '../../i18n';
import ContributorsList from './ContributorsList';
import { actions } from '../slices';
import * as selectors from '../selectors';
import taskDescriptionLanguages from '../config/taskDescriptionLanguages';
import RoomContext from '../containers/RoomContext';
import { validateTaskName } from '../middlewares/Game';
import { inBuilderRoomSelector } from '../machines/selectors';
import useMachineStateSelector from '../utils/useMachineStateSelector';
import { taskStateCodes } from '../config/task';

const defaultLevels = ['elementary', 'easy', 'medium', 'hard'].map(level => ({ value: level, label: _.capitalize(level) }));

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

const renderGameLevelSelectButton = (level, handleSetLevel) => (
  <div className="dropdown mr-1">
    <button
      type="button"
      title="level"
      className={
        cn('btn border-gray dropdown-toggle rounded-lg', {
          'p-0': level === 'hard' || level === 'medium',
          'p-1': level === 'elementary' || level === 'easy',
        })
      }
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

const renderGameLevelBadge = level => (
  <div
    className="text-center"
    data-toggle="tooltip"
    data-placement="right"
    title={level}
  >
    <img alt={level} src={`/assets/images/levels/${level}.svg`} />
  </div>
);

const TaskLanguagesSelection = ({ avaibleLanguages, displayLanguage, handleSetLanguage }) => {
  if (avaibleLanguages.length < 2) {
    return null;
  }

  const renderLanguage = language => (
    <Dropdown.Item
      key={language}
      active={language === displayLanguage}
      onClick={handleSetLanguage(language)}
    >
      {`${language.toUpperCase()}`}
    </Dropdown.Item>
  );

  return (
    <Dropdown className="d-flex ml-auto">
      <Dropdown.Toggle
        id="tasklang-dropdown-toggle"
        className="shadow-none rounded-lg p-1 btn-sm"
        variant="outline-secondary"
      >
        {displayLanguage.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu id="tasklang-dropdown-menu">
        {avaibleLanguages.map(renderLanguage)}
      </Dropdown.Menu>
    </Dropdown>
  );
};

const Task = ({ task }) => {
  const dispatch = useDispatch();

  const { mainService } = useContext(RoomContext);
  const inBuilderRoom = useMachineStateSelector(mainService, inBuilderRoomSelector);

  const taskLanguage = useSelector(selectors.taskDescriptionLanguageselector);

  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  const avaibleLanguages = _.keys(task)
    .filter(key => key.includes('description'))
    .map(key => key.split('description'))
    .map(([, language]) => language.toLowerCase());

  const displayLanguage = _.includes(avaibleLanguages, taskLanguage)
    ? taskLanguage
    : taskDescriptionLanguages.default;

  // TODO: remove russian text from string (create ru/en templates of basic description)
  const taskDescriptionMapping = {
    en: `${task.descriptionEn}\n\n**Examples:**\n${task.examples}`,
    ru: `${task.descriptionRu}\n\n**примеры:**\n${task.examples}`,
  };
  const descriptionTextMapping = {
    en: task.descriptionEn,
    ru: task.descriptionRu,
  };

  const description = taskDescriptionMapping[taskLanguage];

  // for builder
  const taskDescriptionText = descriptionTextMapping[taskLanguage];

  const handleSetLevel = useCallback(
    event => {
      const { value } = event.currentTarget.dataset;
      dispatch(actions.setTaskLevel({ level: value }));
    },
    [dispatch],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const validateName = useCallback(
    _.debounce(name => dispatch(validateTaskName(name)), 700),
    [],
  );

  const handleSetName = useCallback(event => {
    dispatch(actions.setTaskName({ name: event.target.value }));
    validateName(event.target.value);
  }, [validateName, dispatch]);

  const handleSetDescription = useCallback(
    event => {
      dispatch(actions.setTaskDescription({ lang: taskLanguage, value: event.target.value }));
    },
    [taskLanguage, dispatch],
  );

  if (_.isEmpty(task)) {
    return null;
  }

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="px-3 py-3 h-100 overflow-auto" data-guide-id="Task">
        <div className="d-flex align-items-begin flex-column flex-sm-row justify-content-between">
          {inBuilderRoom ? (
            <div className="d-flex align-items-center">
              {renderGameLevelSelectButton(task.level, handleSetLevel)}
              <span className="h6 card-text mb-0 ml-2">{i18n.t('Task: ')}</span>
              {
                task.state === taskStateCodes.blank
                  ? (
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-lg ml-2"
                      placeholder="Enter name"
                      aria-label="Task Name"
                      aria-describedby="basic-addon1"
                      value={task.name}
                      onChange={handleSetName}
                    />
                  ) : (
                    <span className="ml-2 text-muted">{task.name}</span>
                  )
              }
            </div>
          ) : (
            <h6 className="card-text d-flex align-items-center mr-2">
              {renderGameLevelBadge(task.level)}
              <span className="ml-2">{i18n.t('Task: ')}</span>
              <span className="ml-2 text-muted">{task.name}</span>
            </h6>
          )}
          <div className="d-flex align-items-center">
            <TaskLanguagesSelection
              handleSetLanguage={handleSetLanguage}
              avaibleLanguages={avaibleLanguages}
              displayLanguage={displayLanguage}
            />
            {!inBuilderRoom && (
              <ShowGuideButton />
            )}
          </div>
        </div>
        <div className="d-flex align-items-stretch flex-column">
          <div className="card-text mb-0 h-100 overflow-auto">
            {inBuilderRoom ? (
              <>
                <p><strong>Description: </strong></p>
                <textarea
                  className="form-control form-control-sm rounded-lg"
                  id={`description-${taskLanguage}`}
                  rows={5}
                  value={taskDescriptionText}
                  onChange={handleSetDescription}
                />
              </>
            ) : (
              <ReactMarkdown
                source={description}
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
            )}
          </div>
        </div>
        {!inBuilderRoom && task.origin === 'github' && (
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

Task.propTypes = {
  task: PropTypes.shape({
    name: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
    examples: PropTypes.string,
    descriptionEn: PropTypes.string,
    descriptionRu: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

export default Task;
