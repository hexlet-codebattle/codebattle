import React from 'react';

import { Button } from '@mantine/core';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { gameStatusSelector } from '../../selectors';

function BackToTournamentButton() {
  const { tournamentId } = useSelector(gameStatusSelector);
  const tournamentUrl = `/tournaments/${tournamentId}`;

  return (
    <Button component="a" href={tournamentUrl} color="cbSecondary" radius="md" fullWidth>
      {i18next.t('Back to tournament')}
    </Button>
  );
}

export default BackToTournamentButton;
