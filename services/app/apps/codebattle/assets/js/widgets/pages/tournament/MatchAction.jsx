import React, { memo, useContext } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import MatchStatesCodes from '../../config/matchStates';
import { sendMatchGameOver } from '../../middlewares/TournamentAdmin';

function MatchAction({ match, canModerate, currentUserIsPlayer }) {
  const href = `/games/${match.gameId}`;
  const hasCustomEventStyles = useContext(CustomEventStylesContext);
  const streamMode = useSelector(state => state.gameUI.streamMode);

  const showBtnClassName = cn('btn btn-sm text-nowrap rounded-lg px-3', {
    'btn-primary': !hasCustomEventStyles,
    'cb-custom-event-btn-primary': hasCustomEventStyles,
  });
  const continueBtnClassName = cn('btn btn-sm text-nowrap rounded-lg px-3', {
    'btn-success text-white': !hasCustomEventStyles,
    'cb-custom-event-btn-primary': hasCustomEventStyles,
  });
  const gameOverBtnClassName = cn('btn btn-sm text-nowrap rounded-lg px-3', {
    'btn-outline-danger': !hasCustomEventStyles,
    'cb-custom-event-btn-outline-danger': hasCustomEventStyles,
  });

  switch (match.state) {
    case MatchStatesCodes.pending:
      return (
        <a href={href} title="Show match" className={showBtnClassName} disabled>
          <FontAwesomeIcon className="mr-2" icon="eye" />
          {i18next.t('Show')}
        </a>
      );
    case MatchStatesCodes.playing: {
      if (currentUserIsPlayer) {
        return (
          <>
            <a
              href={href}
              title={i18next.t('Continue match')}
              className={continueBtnClassName}
            >
              <FontAwesomeIcon className="mr-2" icon="laptop-code" />
              {i18next.t('Continue')}
            </a>
            {canModerate && !streamMode && (
              <button
                type="button"
                className={gameOverBtnClassName}
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
            className={showBtnClassName}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            {i18next.t('Show')}
          </a>
          {canModerate && !streamMode && (
            <button
              type="button"
              className={gameOverBtnClassName}
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
            className={showBtnClassName}
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
