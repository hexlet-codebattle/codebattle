import React from 'react';
import { UnstyledButton } from '@mantine/core';
import i18n from '../../../i18n';
import { type Run } from './types';

interface MainPanelRunActionsProps {
  activeTab: string;
  run?: Run | null;
  hasViewer: boolean;
  setViewerFullscreen: (value: boolean) => void;
}

const MainPanelRunActions = ({
  activeTab,
  run,
  hasViewer,
  setViewerFullscreen,
}: MainPanelRunActionsProps) => {
  if (activeTab !== 'run' || !run) return null;

  return (
    <>
      {hasViewer && (
        <UnstyledButton
          c="white"
          mr="md"
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => setViewerFullscreen(true)}
        >
          {i18n.t('Fullscreen')}
        </UnstyledButton>
      )}
    </>
  );
};

export default MainPanelRunActions;
