import React from 'react';

import Dropdown from 'react-bootstrap/Dropdown';

function TaskLanguagesSelection({ avaibleLanguages, displayLanguage, handleSetLanguage }) {
  if (avaibleLanguages.length < 2) {
    return null;
  }

  const renderLanguage = (language) => (
    <Dropdown.Item
      key={language}
      active={language === displayLanguage}
      onClick={handleSetLanguage(language)}
    >
      {`${language.toUpperCase()}`}
    </Dropdown.Item>
  );

  return (
    <Dropdown className="d-flex">
      <Dropdown.Toggle
        className="shadow-none rounded-lg p-1 btn-sm"
        id="tasklang-dropdown-toggle"
        variant="outline-secondary"
      >
        {displayLanguage.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu id="tasklang-dropdown-menu">
        {avaibleLanguages.map(renderLanguage)}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default TaskLanguagesSelection;
