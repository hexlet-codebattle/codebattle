import React from 'react';
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
          className="btn btn-outline-secondary btn-sm mx-2 text-nowrap"
          onClick={guideShow}
          data-toggle="tooltip"
          data-placement="top"
          title="Show guide"
        >
          Show guide
        </button>
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
        className="shadow-none"
        variant="outline-secondary"
      >
        {displayLanguage.toUpperCase() }
      </Dropdown.Toggle>
      <Dropdown.Menu id="tasklang-dropdown-menu">
        {avaibleLanguages.map(renderLanguage)}
      </Dropdown.Menu>
    </Dropdown>
  );
};

const Task = ({ task }) => {
  const taskLanguage = useSelector(selectors.taskDescriptionLanguageselector);
  const dispatch = useDispatch();
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
    ru: `${task.descriptionRu}\n\n**Примеры:**\n${task.examples}`,
  };
  const description = taskDescriptionMapping[taskLanguage];

  if (_.isEmpty(task)) {
    return null;
  }

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="px-3 py-3 h-100 overflow-auto" data-guide-id="Task">
        <div className="d-flex align-items-begin flex-column flex-sm-row justify-content-between">
          <h6 className="card-text d-flex align-items-center mr-2">
            {renderGameLevelBadge(task.level)}
            <div>
              {i18n.t('Task: ')}
              <span className="card-subtitle mb-2 text-muted">{task.name}</span>
            </div>
          </h6>
          <TaskLanguagesSelection
            handleSetLanguage={handleSetLanguage}
            avaibleLanguages={avaibleLanguages}
            displayLanguage={displayLanguage}
          />
          <ShowGuideButton />
        </div>
        <div className="d-flex align-items-stretch flex-column">
          <div className="card-text mb-0 h-100 overflow-auto">
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
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
    examples: PropTypes.string.isRequired,
    descriptionEn: PropTypes.string,
    descriptionRu: PropTypes.string,
    tags: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.oneOf([null]),
    ]),
  }).isRequired,
};

export default Task;
