import React, { memo, useContext, useMemo } from 'react';

import { Badge } from '@mantine/core';

import i18next from '../../../i18n';
import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import MatchStatesCodes from '../../config/matchStates';

interface TournamentMatchBadgeProps {
  matchState: string;
  isWinner: boolean;
  currentUserIsPlayer: boolean;
}

function TournamentMatchBadge({
  matchState,
  isWinner,
  currentUserIsPlayer,
}: TournamentMatchBadgeProps) {
  const title = useMemo(() => {
    switch (matchState) {
      case MatchStatesCodes.pending:
        return i18next.t('Next');
      case MatchStatesCodes.playing:
        return i18next.t('In progress');
      case MatchStatesCodes.gameOver: {
        if (isWinner) {
          return i18next.t('Won');
        }
        if (!isWinner) {
          return i18next.t('Lost');
        }

        return i18next.t('Draw');
      }
      case MatchStatesCodes.timeout:
      case MatchStatesCodes.canceled:
      default:
        return i18next.t('Draw');
    }
  }, [matchState, isWinner]);

  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const customClassName = useMemo(() => {
    if (!hasCustomEventStyles) return undefined;
    if (isWinner && matchState === MatchStatesCodes.gameOver)
      return 'cb-custom-event-badge-warning';
    if (
      matchState === MatchStatesCodes.pending ||
      matchState === MatchStatesCodes.timeout ||
      matchState === MatchStatesCodes.canceled
    )
      return 'cb-custom-event-badge-light';
    if (!currentUserIsPlayer && matchState === MatchStatesCodes.playing)
      return 'cb-custom-event-badge-primary';
    if (matchState === MatchStatesCodes.playing) return 'cb-custom-event-badge-success';
    if (!isWinner && matchState === MatchStatesCodes.gameOver)
      return 'cb-custom-event-badge-danger';
    return undefined;
  }, [hasCustomEventStyles, isWinner, matchState, currentUserIsPlayer]);

  const badgeColor = useMemo(() => {
    if (isWinner && matchState === MatchStatesCodes.gameOver) return 'yellow';
    if (
      matchState === MatchStatesCodes.pending ||
      matchState === MatchStatesCodes.timeout ||
      matchState === MatchStatesCodes.canceled
    )
      return 'gray';
    if (!currentUserIsPlayer && matchState === MatchStatesCodes.playing) return 'blue';
    if (matchState === MatchStatesCodes.playing) return 'green';
    if (!isWinner && matchState === MatchStatesCodes.gameOver) return 'red';
    return 'gray';
  }, [isWinner, matchState, currentUserIsPlayer]);

  return (
    <Badge color={badgeColor} className={customClassName} mr="xs">
      {title}
    </Badge>
  );
}

export default memo(TournamentMatchBadge);
