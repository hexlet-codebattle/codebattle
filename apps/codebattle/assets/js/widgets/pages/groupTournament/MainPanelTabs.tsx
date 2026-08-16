import React from 'react';
import { Badge, Flex } from '@mantine/core';
import i18n from '../../../i18n';
import { type ExternalSetup } from './types';
import TabButton from './TabButton';

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
  <Flex align="center" wrap="wrap" mr="md">
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
        <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
          {tab === 'settings' ? (
            <>
              {i18n.t('External Setup')}
              <Badge ml="sm" color={externalSetup?.state === 'ready' ? 'green' : 'yellow'}>
                {externalSetup?.state}
              </Badge>
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
        </TabButton>
      ))}
  </Flex>
);

export default MainPanelTabs;
