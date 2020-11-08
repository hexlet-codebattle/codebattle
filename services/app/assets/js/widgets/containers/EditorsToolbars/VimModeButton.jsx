import { useDispatch } from 'react-redux';
import React, { useContext } from 'react';
import cn from 'classnames';

import { VimModeContext } from '../../contexts/EditorToolbarContext';
import { actions } from '../../slices';
import EditorModes from '../../config/editorModes';

export default () => {
  const dispatch = useDispatch();

  const [isVimMode, setVimMode] = useContext(VimModeContext);

  const mode = isVimMode ? EditorModes.default : EditorModes.vim;

  const classNames = cn('btn btn-sm border rounded ml-2', {
    'btn-light': !isVimMode,
    'btn-secondary': isVimMode,
  });

  const handleToggleVimMode = () => {
    setVimMode(!isVimMode);
    dispatch(actions.setEditorsMode(mode));
  };

  return (
    <button type="button" className={classNames} onClick={handleToggleVimMode}>
      Vim
    </button>
  );
};
