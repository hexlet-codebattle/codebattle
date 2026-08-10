import React from 'react';
import { Flex, Text } from '@mantine/core';
import i18n from '../../../i18n';

interface LeaderboardHeaderProps {
  currentRoundPosition?: number;
  roundsCount?: number;
}

const LeaderboardHeader = ({ currentRoundPosition, roundsCount }: LeaderboardHeaderProps) => (
  <Flex
    justify="space-between"
    px="md"
    pb="sm"
    style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
  >
    <Text fw={700}>{i18n.t('Leaderboard')}</Text>
    {Number.isInteger(currentRoundPosition) && Number.isInteger(roundsCount) && (
      <Text c="dimmed" size="sm">
        {`${i18n.t('Round')} ${currentRoundPosition}/${roundsCount}`}
      </Text>
    )}
  </Flex>
);

export default LeaderboardHeader;
