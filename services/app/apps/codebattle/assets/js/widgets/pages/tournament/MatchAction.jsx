import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';

import MatchStatesCodes from '../../config/matchStates';
import { sendMatchGameOver } from '../../middlewares/TournamentAdmin';

function MatchAction({
  match,
  canModerate,
  currentUserIsPlayer,
}) {
  const href = `/games/${match.gameId}`;

  switch (match.state) {
    case MatchStatesCodes.pending:
      return (
        <a
          href={href}
          title="Show match"
          className="btn btn-primary btn-sm text-nowrap rounded-lg px-3"
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
              className="btn btn-success btn-sm text-white text-nowrap rounded-lg px-3"
            >
              <FontAwesomeIcon className="mr-2" icon="laptop-code" />
              {i18next.t('Continue')}
            </a>
            {canModerate && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm text-nowrap rounded-lg px-3"
              onClick={() => sendMatchGameOver(match.id)}
            >
              <FontAwesomeIcon className="mr-2" icon="window-close" />
              {i18next.t('Game Over')}
            </button>
          )}
          </>
        );
      }

      return (
        <>
          <a
            href={href}
            title={i18next.t('Show match')}
            className="btn btn-primary btn-sm text-nowrap rounded-lg px-3"
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            {i18next.t('Show')}
          </a>
          {canModerate && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm text-nowrap rounded-lg px-3"
              onClick={() => sendMatchGameOver(match.id)}
            >
              <FontAwesomeIcon className="mr-2" icon="window-close" />
              {i18next.t('Game Over')}
            </button>
          )}
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
            className="btn btn-primary btn-sm text-nowrap rounded-lg px-3"
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
