import cn from 'classnames';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import editorModes from '../../config/editorModes';
import { editorsModeSelector } from '../../selectors';
import { actions } from '../../slices';

const VimModeButton = ({ player }) => {
  const dispatch = useDispatch();
  const currentMode = useSelector(state => editorsModeSelector(player.id)(state));

  const isVimMode = currentMode === editorModes.vim;

  const mode = isVimMode ? editorModes.default : editorModes.vim;

  const classNames = cn('btn btn-sm mr-2', {
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
