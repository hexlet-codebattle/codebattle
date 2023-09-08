import React from 'react';

import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import editorThemes from '../../config/editorThemes';
import { editorsThemeSelector } from '../../selectors';
import { actions } from '../../slices';

function DakModeButton({ playerId }) {
  const dispatch = useDispatch();

  const currentTheme = useSelector((state) => editorsThemeSelector(playerId)(state));

  const isDarkMode = currentTheme === editorThemes.dark;
  const mode = isDarkMode ? editorThemes.light : editorThemes.dark;

  const classNames = cn('btn btn-sm mr-2 border-left rounded-right', {
    'btn-light': isDarkMode,
    'btn-secondary': !isDarkMode,
  });

  const handleToggleDarkMode = () => {
    dispatch(actions.switchEditorsTheme(mode));
  };

  return (
    <button className={classNames} type="button" onClick={handleToggleDarkMode}>
      {isDarkMode ? 'Light' : 'Dark'}
    </button>
  );
}

export default DakModeButton;
