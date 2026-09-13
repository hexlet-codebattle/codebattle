import React, { memo } from 'react';

import { Button, Flex, Text } from '@mantine/core';
import i18next from 'i18next';

import TournamentTypes from '../../config/tournamentTypes';

interface Top200RedirectButtonProps {
  currentRoundPosition: number;
  player?: { place?: number | string; [key: string]: unknown };
  playersRedirectUrl?: string;
  type?: string;
}

function Top200RedirectButton({
  currentRoundPosition,
  player,
  playersRedirectUrl,
  type,
}: Top200RedirectButtonProps) {
  const playerPlace = Number(player?.place);
  const showButton =
    type === TournamentTypes.top200 &&
    typeof playersRedirectUrl === 'string' &&
    playersRedirectUrl.length > 0 &&
    currentRoundPosition >= 4 &&
    Number.isFinite(playerPlace) &&
    playerPlace >= 9 &&
    playerPlace <= 200;

  if (!showButton) {
    return null;
  }

  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      align={{ base: 'stretch', md: 'center' }}
      justify="space-between"
      py="xs"
      gap="xs"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Text fw={700} c="cbTextLight">
        {i18next.t('The tournament continues for top 8 players.')}
      </Text>
      <Button component="a" color="yellow" size="xs" radius="md" href={playersRedirectUrl}>
        {i18next.t('Continue')}
      </Button>
    </Flex>
  );
}

export default memo(Top200RedirectButton);
