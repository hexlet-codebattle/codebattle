import React from 'react';
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
    <div className="d-flex align-items-center">
      {hasViewer ? (
        <span
          role="button"
          tabIndex={0}
          className="text-white mr-3"
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => setViewerFullscreen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setViewerFullscreen(true);
          }}
        >
          {i18n.t('Fullscreen')}
        </span>
      ) : null}
    </div>
  );
};

export default MainPanelRunActions;
