import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';

import MatchStatesCodes from '../../config/matchStates';

function MatchAction({
  match,
  currentUserIsPlayer,
}) {
  const href = `/games/${match.gameId}`;

  switch (match.state) {
    case MatchStatesCodes.pending:
      return (
        <a
          href={href}
          title="Show match"
          className="btn btn-primary btn-sm rounded-lg px-3"
          disabled
        >
          <FontAwesomeIcon className="mr-2" icon="eye" />
          Show
        </a>
      );
    case MatchStatesCodes.playing: {
      if (currentUserIsPlayer) {
        return (
          <>
            <a
              href={href}
              title={i18next.t('Continue match')}
              className="btn btn-success btn-sm text-white rounded-lg px-3"
            >
              <FontAwesomeIcon className="mr-2" icon="laptop-code" />
              {i18next.t('Continue')}
            </a>
          </>
        );
      }

      return (
        <>
          <a
            href={href}
            title={i18next.t('Show match')}
            className="btn btn-primary btn-sm rounded-lg px-3"
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            {i18next.t('Show')}
          </a>
        </>
      );
    }
    case MatchStatesCodes.canceled:
    case MatchStatesCodes.timeout:
    case MatchStatesCodes.gameOver:
      return (
        <>
          <a
            href={href}
            title={i18next.t('Show game history')}
            className="btn btn-primary btn-sm rounded-lg px-3"
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            {i18next.t('Show')}
          </a>
        </>
      );
    default:
      throw new Error(`Invalid Match state: ${match.state}`);
  }
}

export default memo(MatchAction);
