import cn from 'classnames';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import EditorModes from '../../config/editorModes';
import { editorsModeSelector } from '../../selectors';
import { actions } from '../../slices';

const VimModeButton = ({ player }) => {
  const dispatch = useDispatch();
  const currentMode = useSelector(state => editorsModeSelector(player.id)(state));

  const isVimMode = currentMode === EditorModes.vim;

  const mode = isVimMode ? EditorModes.default : EditorModes.vim;

  const classNames = cn('btn btn-sm rounded mr-2', {
    'btn-light': !isVimMode,
    'btn-secondary': isVimMode,
  });

  const handleToggleVimMode = () => {
    dispatch(actions.setEditorsMode(mode));
  };

  return (
    <button type="button" className={classNames} onClick={handleToggleVimMode}>
      Vim
    </button>
  );
};

export default VimModeButton;
