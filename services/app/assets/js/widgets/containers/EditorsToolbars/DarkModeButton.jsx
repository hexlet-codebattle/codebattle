import { useDispatch } from 'react-redux';
import React, { useContext } from 'react';
import cn from 'classnames';

import { DarkModeContext } from '../../contexts/EditorToolbarContext';
import { actions } from '../../slices';
import EditorThemes from '../../config/editorThemes';

export default () => {
  const dispatch = useDispatch();

  const [isDarkMode, toggleDarkMode] = useContext(DarkModeContext);

  const mode = isDarkMode ? EditorThemes.light : EditorThemes.dark;

  const classNames = cn('btn btn-sm border rounded ml-2', {
    'btn-light': isDarkMode,
    'btn-secondary': !isDarkMode,
  });

  const handleToggleDarkMode = () => {
    toggleDarkMode(!isDarkMode);
    dispatch(actions.switchEditorsTheme(mode));
  };

  return (
    <button type="button" className={classNames} onClick={handleToggleDarkMode}>
      {isDarkMode ? 'Light' : 'Dark'}
    </button>
  );
};
