import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Text } from '@mantine/core';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { currentUserCanModerateTournament, tournamentHideResultsSelector } from '@/selectors';

interface TournamentPlaceProps {
  place: number | string;
  title?: string;
  withIcon?: boolean;
}

function TournamentPlace({ place, title = '', withIcon = false }: TournamentPlaceProps) {
  const hideResults = useSelector(tournamentHideResultsSelector);
  const canModerate = useSelector(currentUserCanModerateTournament);

  const text = !hideResults || canModerate ? place : '?';
  const prefix = title.length > 0 || withIcon ? ': ' : '';
  const muteResults = canModerate && hideResults;

  return (
    <Box
      component="span"
      p={muteResults ? 4 : 0}
      bg={muteResults ? 'gray.1' : undefined}
      style={{ borderRadius: muteResults ? 'var(--mantine-radius-md)' : undefined }}
    >
      {withIcon && <FontAwesomeIcon className="text-warning" icon="trophy" />}
      <Text component="span" c={muteResults ? 'dimmed' : undefined}>
        {i18next.t(title)}
        {prefix}
        {text}
      </Text>
    </Box>
  );
}

export default memo(TournamentPlace);
