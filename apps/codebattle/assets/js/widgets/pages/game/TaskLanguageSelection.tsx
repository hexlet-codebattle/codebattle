import React from 'react';

import { Button, Menu } from '@mantine/core';

interface TaskLanguagesSelectionProps {
  avaibleLanguages: string[];
  displayLanguage: string;
  handleSetLanguage: (language: string) => () => void;
}

function TaskLanguagesSelection({
  avaibleLanguages,
  displayLanguage,
  handleSetLanguage,
}: TaskLanguagesSelectionProps) {
  if (avaibleLanguages.length < 2) {
    return null;
  }

  const renderLanguage = (language: string) => (
    <Menu.Item
      key={language}
      onClick={handleSetLanguage(language)}
      className="cb-dropdown-item"
      data-active={language === displayLanguage || undefined}
    >
      <span translate="no">{`${language.toUpperCase()}`}</span>
    </Menu.Item>
  );

  return (
    <Menu>
      <Menu.Target>
        <Button
          id="tasklang-dropdown-toggle"
          className="shadow-none cb-rounded p-1 btn btn-sm btn-outline-secondary cb-btn-outline-secondary"
          variant="outline"
          color="cbSecondary"
          size="xs"
        >
          {displayLanguage.toUpperCase()}
        </Button>
      </Menu.Target>
      <Menu.Dropdown id="tasklang-dropdown-menu" className="cb-blur">
        {avaibleLanguages.map(renderLanguage)}
      </Menu.Dropdown>
    </Menu>
  );
}

export default TaskLanguagesSelection;
