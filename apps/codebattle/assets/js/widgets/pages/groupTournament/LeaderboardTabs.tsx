import React from 'react';
import { Flex } from '@mantine/core';
import i18n from '../../../i18n';
import { roundLabel } from '../../utils/groupTournament';
import TabButton from './TabButton';

interface LeaderboardTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  rounds: number[];
}

const LeaderboardTabs = ({ activeTab, setActiveTab, rounds }: LeaderboardTabsProps) => (
  <Flex wrap="wrap" px="md" pt="sm">
    <TabButton active={activeTab === 'rating'} onClick={() => setActiveTab('rating')}>
      {i18n.t('Leaderboard')}
    </TabButton>
    {rounds.map((r) => (
      <TabButton
        key={`tab-${r}`}
        active={activeTab === `round-${r}`}
        onClick={() => setActiveTab(`round-${r}`)}
      >
        {roundLabel(r)}
      </TabButton>
    ))}
  </Flex>
);

export default LeaderboardTabs;
