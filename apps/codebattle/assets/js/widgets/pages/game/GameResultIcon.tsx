import React from 'react';

import find from 'lodash/find';
import get from 'lodash/get';
import { Tooltip } from '@mantine/core';
import { useSelector } from 'react-redux';

import i18n from '../../../i18n';
import * as selectors from '../../selectors';

const mapModeToWinImgProps: Record<string, React.ImgHTMLAttributes<HTMLImageElement>> = {
  default: { src: '/assets/images/big-gold-cup.png', alt: i18n.t('Gold cup') },
  spectator: {
    src: '/assets/images/check.png',
    alt: i18n.t('Green check'),
    style: { width: '100px', height: '100px' },
  },
};

interface GameResultIconProps {
  userId: number;
  mode?: string;
}

function GameResultIcon({ userId, mode = 'default' }: GameResultIconProps) {
  const players = useSelector(selectors.gamePlayersSelector);

  const opponent = find(players, ({ id }: { id: number }) => id !== userId);

  const resultUser1 = get(players, [userId, 'result']);
  const resultUser2 = get(players, [(opponent as Record<string, unknown>)?.Id as string, 'result']);

  const winIconProps = mapModeToWinImgProps[mode];

  if (resultUser1 === 'gave_up') {
    return (
      <Tooltip label={i18n.t('Player gave up')} position="left" withArrow>
        <img
          src="/assets/images/big-flag.png"
          alt={i18n.t('White flag')}
          style={{ width: '200px' }}
        />
      </Tooltip>
    );
  }

  if (resultUser1 === 'won' && resultUser2 !== 'gave_up') {
    return (
      <Tooltip label={i18n.t('Player won')} position="left" withArrow>
        <img alt={i18n.t('Win icon')} {...winIconProps} />
      </Tooltip>
    );
  }

  return null;
}

export default GameResultIcon;
