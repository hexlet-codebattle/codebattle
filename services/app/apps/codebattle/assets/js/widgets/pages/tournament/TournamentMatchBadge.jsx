import React, {
  memo, useContext, useMemo,
} from 'react';

import cn from 'classnames';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
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
        if (!isWinner) {
          return 'Lose';
        }

        return 'Over';
      }
      case MatchStatesCodes.timeout:
      case MatchStatesCodes.canceled:
      default:
        return 'Over';
    }
  }, [matchState, isWinner]);

  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const className = cn('badge px-2 mr-2', hasCustomEventStyles ? {
    'cb-custom-event-badge-warning': isWinner && matchState === MatchStatesCodes.gameOver,
    'cb-custom-event-badge-light':
      matchState === MatchStatesCodes.pending
      || matchState === MatchStatesCodes.timeout
      || matchState === MatchStatesCodes.canceled,
    'cb-custom-event-badge-primary': !currentUserIsPlayer && matchState === MatchStatesCodes.playing,
    'cb-custom-event-badge-success': matchState === MatchStatesCodes.playing,
    'cb-custom-event-badge-danger': !isWinner && matchState === MatchStatesCodes.gameOver,
  } : {
    'badge-warning': isWinner && matchState === MatchStatesCodes.gameOver,
    'badge-light':
      matchState === MatchStatesCodes.pending
      || matchState === MatchStatesCodes.timeout
      || matchState === MatchStatesCodes.canceled,
    'badge-primary': !currentUserIsPlayer && matchState === MatchStatesCodes.playing,
    'badge-success': matchState === MatchStatesCodes.playing,
    'badge-danger': !isWinner && matchState === MatchStatesCodes.gameOver,
  });

  return <span className={className}>{title}</span>;
}

export default memo(TournamentMatchBadge);
