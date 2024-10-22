import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import editorThemes from '../../config/editorThemes';
import { editorsThemeSelector } from '../../selectors';
import { actions } from '../../slices';

function DakModeButton() {
  const dispatch = useDispatch();

  const currentTheme = useSelector(editorsThemeSelector);

  const isDarkMode = currentTheme === editorThemes.dark;
  const mode = isDarkMode ? editorThemes.light : editorThemes.dark;

  const className = cn('btn mr-2 border rounded', {
    'btn-light': isDarkMode,
    'btn-secondary': !isDarkMode,
  });

  const handleToggleDarkMode = () => {
    dispatch(actions.switchEditorsTheme(mode));
  };

  return (
    <button type="button" className={className} onClick={handleToggleDarkMode}>
      <FontAwesomeIcon icon={isDarkMode ? 'sun' : 'moon'} />
    </button>
  );
}

export default DakModeButton;
