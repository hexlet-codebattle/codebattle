import React, {
  memo, useMemo,
} from 'react';

import cn from 'classnames';

import MatchStatesCodes from '../../config/matchStates';

function TournamentMatchBadge({ matchState, isWinner, currentUserIsPlayer }) {
  const title = useMemo(() => {
    switch (matchState) {
      case MatchStatesCodes.pending:
        return 'Next';
      case MatchStatesCodes.playing:
        return 'Active';
      case MatchStatesCodes.gameOver: {
        if (isWinner) {
          return 'Won';
        }
        if (currentUserIsPlayer && !isWinner) {
          return 'Lose';
        }

        return 'Over';
      }
      case MatchStatesCodes.timeout:
      case MatchStatesCodes.canceled:
      default:
        return 'Over';
    }
  }, [matchState, isWinner, currentUserIsPlayer]);
  const className = cn('badge px-2 mr-2', {
    'badge-warning': isWinner && matchState === MatchStatesCodes.gameOver,
    'badge-light':
      matchState === MatchStatesCodes.pending
      || matchState === MatchStatesCodes.timeout
      || matchState === MatchStatesCodes.canceled,
    'badge-primary':
      !currentUserIsPlayer && matchState === MatchStatesCodes.playing,
    'badge-success': matchState === MatchStatesCodes.playing,
    'badge-danger':
      currentUserIsPlayer
      && !isWinner
      && matchState === MatchStatesCodes.gameOver,
  });

  return <span className={className}>{title}</span>;
}

export default memo(TournamentMatchBadge);
