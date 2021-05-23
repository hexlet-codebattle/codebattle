import cn from 'classnames';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import editorThemes from '../../config/editorThemes';
import { editorsThemeSelector } from '../../selectors';
import { actions } from '../../slices';

const DakModeButton = ({ player }) => {
  const dispatch = useDispatch();

  const currentTheme = useSelector(state => editorsThemeSelector(player.id)(state));

  const isDarkMode = currentTheme === editorThemes.dark;

  const mode = isDarkMode ? editorThemes.light : editorThemes.dark;

  const classNames = cn('btn btn-sm mr-2', {
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
};

export default DakModeButton;
