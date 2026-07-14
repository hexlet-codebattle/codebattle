import React from 'react';
import i18n from '../../../i18n';
import { tabBtnClass, tabBtnStyle } from '../../utils/groupTournament';
import { type ExternalSetup } from './types';

interface MainPanelTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasLeaderboard?: boolean;
  hasTaskDescription?: boolean;
  isWaiting?: boolean;
  isAdmin?: boolean;
  externalSetup?: ExternalSetup | null;
}

const MainPanelTabs = ({
  activeTab,
  setActiveTab,
  hasLeaderboard,
  hasTaskDescription,
  isWaiting,
  isAdmin,
  externalSetup,
}: MainPanelTabsProps) => (
  <div className="d-flex align-items-center flex-wrap mr-3">
    {(
      [
        'description',
        hasTaskDescription && 'task_description',
        !isWaiting && 'run',
        !isWaiting && hasLeaderboard && 'leaderboard',
        !isWaiting && isAdmin && !!externalSetup && 'settings',
      ] as Array<string | false>
    )
      .filter((tab): tab is string => Boolean(tab))
      .map((tab) => (
        <button
          key={tab}
          type="button"
          className={tabBtnClass(activeTab === tab)}
          style={tabBtnStyle(activeTab === tab)}
          onClick={() => setActiveTab(tab)}
        >
          {tab === 'settings' ? (
            <>
              {i18n.t('External Setup')}
              <span
                className={`badge ml-2 ${externalSetup?.state === 'ready' ? 'badge-success' : 'badge-warning'}`}
              >
                {externalSetup?.state}
              </span>
            </>
          ) : (
            i18n.t(
              (
                {
                  description: 'Description',
                  task_description: 'Task',
                  run: 'Run Viewer',
                  leaderboard: 'Leaderboard',
                } as Record<string, string>
              )[tab],
            )
          )}
        </button>
      ))}
  </div>
);

export default MainPanelTabs;
