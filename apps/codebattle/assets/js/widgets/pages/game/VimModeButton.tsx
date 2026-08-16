import React from 'react';

import { Button } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import editorModes from '../../config/editorModes';
import { editorsModeSelector } from '../../selectors';
import { actions, type AppDispatch } from '../../slices';

interface VimModeButtonProps {
  playerId?: number;
}

function VimModeButton(_props: VimModeButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentMode = useSelector(editorsModeSelector);
  const isVimMode = currentMode === editorModes.vim;

  const handleToggleVimMode = () => {
    dispatch(actions.setEditorsMode(isVimMode ? editorModes.default : editorModes.vim));
  };

  // Use meaningful text, not just color, to indicate state
  const buttonText = isVimMode ? 'Vim' : 'Vim';

  return (
    <Button
      type="button"
      size="sm"
      radius="md"
      variant={isVimMode ? 'filled' : 'outline'}
      style={{
        backgroundColor: isVimMode ? '#3a3f50' : undefined,
        borderColor: '#3a3f50',
        color: isVimMode ? undefined : 'var(--mantine-color-dark-8)',
      }}
      onClick={handleToggleVimMode}
      aria-pressed={isVimMode}
      title={isVimMode ? 'Disable Vim mode' : 'Enable Vim mode'}
    >
      {buttonText}
    </Button>
  );
}

export default VimModeButton;
