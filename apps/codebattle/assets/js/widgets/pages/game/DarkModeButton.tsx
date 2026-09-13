import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import editorThemes from '../../config/editorThemes';
import { editorsThemeSelector } from '../../selectors';
import { actions, type AppDispatch } from '../../slices';

interface DarkModeButtonProps {
  className?: string;
  playerId?: number | null;
  player?: unknown;
}

function DarkModeButton({ className }: DarkModeButtonProps) {
  const dispatch = useDispatch<AppDispatch>();

  const currentTheme = useSelector(editorsThemeSelector);

  const isDarkMode = currentTheme === editorThemes.dark;
  const mode = isDarkMode ? editorThemes.light : editorThemes.dark;

  const handleToggleDarkMode = () => {
    dispatch(actions.switchEditorsTheme(mode));
  };

  return (
    <ActionIcon
      variant={isDarkMode ? 'filled' : 'default'}
      size="sm"
      className={className}
      onClick={handleToggleDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span style={{ visibility: 'hidden' }}>1</span>
      <FontAwesomeIcon style={{ marginLeft: '-8px' }} icon={isDarkMode ? 'sun' : 'moon'} />
    </ActionIcon>
  );
}

export default DarkModeButton;
