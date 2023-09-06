import React from 'react';

import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import editorModes from '../../config/editorModes';
import { editorsModeSelector } from '../../selectors';
import { actions } from '../../slices';

function VimModeButton({ playerId }) {
  const dispatch = useDispatch();
  const currentMode = useSelector(state => editorsModeSelector(playerId)(state));

  const isVimMode = currentMode === editorModes.vim;

  const mode = isVimMode ? editorModes.default : editorModes.vim;

  const classNames = cn('btn btn-sm rounded-left', {
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
}

export default VimModeButton;
