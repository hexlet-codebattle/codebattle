import React from 'react';

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

  const classNames = cn('btn btn-sm mr-2 border rounded', {
    'btn-light': isDarkMode,
    'btn-secondary': !isDarkMode,
  });

  const handleToggleDarkMode = () => {
    dispatch(actions.switchEditorsTheme(mode));
  };

  return (
    <button type="button" className={classNames} onClick={handleToggleDarkMode}>
      {isDarkMode ? 'Light' : 'Dark'}
    </button>
  );
}

export default DakModeButton;
