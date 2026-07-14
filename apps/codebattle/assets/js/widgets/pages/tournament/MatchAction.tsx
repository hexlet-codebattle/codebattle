import React, { memo, useContext } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
// import { useSelector } from 'react-redux';

import i18next from '../../../i18n';
import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import MatchStatesCodes from '../../config/matchStates';
// import { sendMatchGameOver } from '../../middlewares/TournamentAdmin';

interface MatchActionMatch {
  gameId: number;
  state: string;
  [key: string]: unknown;
}

interface MatchActionProps {
  match: MatchActionMatch;
  currentUserIsPlayer: boolean;
}

function MatchAction({ match, currentUserIsPlayer }: MatchActionProps) {
  const href = `/games/${match.gameId}`;
  const hasCustomEventStyles = useContext(CustomEventStylesContext);
  // const streamMode = useSelector(state => state.gameUI.streamMode);

  const showBtnClassName = cn('btn btn-sm text-nowrap rounded-lg px-2', {
    'btn-secondary cb-btn-secondary': !hasCustomEventStyles,
    'cb-custom-event-btn-primary': hasCustomEventStyles,
  });
  const continueBtnClassName = cn('btn btn-sm text-nowrap rounded-lg px-3', {
    'btn-success cb-btn-success text-white': !hasCustomEventStyles,
    'cb-custom-event-btn-primary': hasCustomEventStyles,
  });
  // const gameOverBtnClassName = cn('btn btn-sm text-nowrap rounded-lg px-3', {
  //   'btn-outline-danger': !hasCustomEventStyles,
  //   'cb-custom-event-btn-outline-danger': hasCustomEventStyles,
  // });

  switch (match.state) {
    case MatchStatesCodes.pending:
      return (
        <a
          href={href}
          title={i18next.t('Show match')}
          aria-label={i18next.t('Show')}
          className={showBtnClassName}
          // `disabled` is not a valid <a> attribute; preserved from original JS
          {...({ disabled: true } as object)}
        >
          <FontAwesomeIcon icon="eye" />
        </a>
      );
    case MatchStatesCodes.playing: {
      if (currentUserIsPlayer) {
        return (
          <a href={href} title={i18next.t('Continue match')} className={continueBtnClassName}>
            <FontAwesomeIcon className="mr-2" icon="laptop-code" />
            {i18next.t('Continue')}
          </a>
        );
      }

      return (
        <a
          href={href}
          title={i18next.t('Show match')}
          aria-label={i18next.t('Show')}
          className={showBtnClassName}
        >
          <FontAwesomeIcon icon="eye" />
        </a>
      );
    }
    case MatchStatesCodes.canceled:
    case MatchStatesCodes.timeout:
    case MatchStatesCodes.gameOver:
      return (
        <a
          href={href}
          title={i18next.t('Show game history')}
          aria-label={i18next.t('Show')}
          className={showBtnClassName}
        >
          <FontAwesomeIcon icon="eye" />
        </a>
      );
    default:
      throw new Error(`Invalid Match state: ${match.state}`);
  }
}

export default memo(MatchAction);
