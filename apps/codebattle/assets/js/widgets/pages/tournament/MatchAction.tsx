import React, { memo, useContext } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@mantine/core';

import i18next from '../../../i18n';
import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import MatchStatesCodes from '../../config/matchStates';

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

  const customClassName = hasCustomEventStyles ? 'cb-custom-event-btn-primary' : undefined;

  switch (match.state) {
    case MatchStatesCodes.pending:
      return (
        <Button
          component="a"
          href={href}
          title={i18next.t('Show match')}
          aria-label={i18next.t('Show')}
          color="cbSecondary"
          size="xs"
          radius="md"
          className={customClassName}
          disabled
        >
          <FontAwesomeIcon icon="eye" />
        </Button>
      );
    case MatchStatesCodes.playing: {
      if (currentUserIsPlayer) {
        return (
          <Button
            component="a"
            href={href}
            title={i18next.t('Continue match')}
            color="cbSuccess"
            size="xs"
            radius="md"
            className={customClassName}
            leftSection={<FontAwesomeIcon icon="laptop-code" />}
          >
            {i18next.t('Continue')}
          </Button>
        );
      }

      return (
        <Button
          component="a"
          href={href}
          title={i18next.t('Show match')}
          aria-label={i18next.t('Show')}
          color="cbSecondary"
          size="xs"
          radius="md"
          className={customClassName}
        >
          <FontAwesomeIcon icon="eye" />
        </Button>
      );
    }
    case MatchStatesCodes.canceled:
    case MatchStatesCodes.timeout:
    case MatchStatesCodes.gameOver:
      return (
        <Button
          component="a"
          href={href}
          title={i18next.t('Show game history')}
          aria-label={i18next.t('Show')}
          color="cbSecondary"
          size="xs"
          radius="md"
          className={customClassName}
        >
          <FontAwesomeIcon icon="eye" />
        </Button>
      );
    default:
      throw new Error(`Invalid Match state: ${match.state}`);
  }
}

export default memo(MatchAction);
