import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import MatchStatesCodes from '../../config/matchStates';

function MatchAction({ currentUserIsPlayer, match }) {
  const href = `/games/${match.gameId}`;

  switch (match.state) {
    case MatchStatesCodes.pending:
      return (
        <a
          href={href}
          title="Show match"
          className="btn btn-primary btn-sm rounded-lg"
          disabled
        >
          <FontAwesomeIcon className="mr-2" icon="eye" />
          Show
        </a>
      );
    case MatchStatesCodes.playing: {
      if (currentUserIsPlayer) {
        return (
          <a
            href={href}
            title="Continue match"
            className="btn btn-success btn-sm text-white rounded-lg"
          >
            <FontAwesomeIcon className="mr-2" icon="laptop-code" />
            Continue
          </a>
        );
      }

      return (
        <a
          href={href}
          title="Show match"
          className="btn btn-primary btn-sm rounded-lg"
        >
          <FontAwesomeIcon className="mr-2" icon="eye" />
          Show
        </a>
      );
    }
    case MatchStatesCodes.canceled:
    case MatchStatesCodes.timeout:
    case MatchStatesCodes.gameOver:
      return (
        <a
          href={href}
          title="Show game history"
          className="btn btn-primary btn-sm rounded-lg"
        >
          <FontAwesomeIcon className="mr-2" icon="eye" />
          Show
        </a>
      );
    default:
      throw new Error(`Invalid Match state: ${match.state}`);
  }
}

export default memo(MatchAction);
