import React from 'react';

import cn from 'classnames';
// import { Col } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import editorModes from '../../config/editorModes';
import { editorsModeSelector } from '../../selectors';
import { actions } from '../../slices';

function VimModeButton() {
  const dispatch = useDispatch();
  const currentMode = useSelector(editorsModeSelector);
  const isVimMode = currentMode === editorModes.vim;

  const handleToggleVimMode = () => {
    dispatch(
      actions.setEditorsMode(isVimMode ? editorModes.default : editorModes.vim),
    );
  };

  // Use meaningful text, not just color, to indicate state
  const buttonText = isVimMode ? 'Vim' : 'Vim';

  // Keep styling if desired, but ensure text clarifies the mode
  const classNames = cn('btn btn-sm cb-rounded', {
    'btn-outline-secondary cb-btn-outline-secondary': !isVimMode,
    'btn-secondary cb-btn-secondary': isVimMode,
  });

  return (
    <button
      type="button"
      className={classNames}
      onClick={handleToggleVimMode}
      aria-pressed={isVimMode}
      title={isVimMode ? 'Disable Vim mode' : 'Enable Vim mode'}
    >
      {buttonText}
    </button>
  );
}

export default VimModeButton;
