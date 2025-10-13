import React from 'react';

import Dropdown from 'react-bootstrap/Dropdown';

const TaskLanguagesSelection = ({
  avaibleLanguages,
  displayLanguage,
  handleSetLanguage,
}) => {
  if (avaibleLanguages.length < 2) {
    return null;
  }

  const renderLanguage = language => (
    <Dropdown.Item
      key={language}
      active={language === displayLanguage}
      onClick={handleSetLanguage(language)}
    >
      <span translate="no">{`${language.toUpperCase()}`}</span>
    </Dropdown.Item>
  );

  return (
    <Dropdown className="d-flex">
      <Dropdown.Toggle
        id="tasklang-dropdown-toggle"
        className="shadow-none cb-rounded p-1 btn btn-sm btn-outline-secondary cb-btn-outline-secondary"
        variant="none"
      >
        {displayLanguage.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu id="tasklang-dropdown-menu" className="cb-bg-highlight-panel cb-border-color text-white">
        {avaibleLanguages.map(renderLanguage)}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default TaskLanguagesSelection;
