import React from 'react';

import find from 'lodash/find';
import get from 'lodash/get';
import Tooltip from 'react-bootstrap/Tooltip';
import { useSelector } from 'react-redux';

import OverlayTrigger from '@/components/OverlayTriggerCompat';

import * as selectors from '../../selectors';

const mapModeToWinImgProps = {
  default: { src: '/assets/images/big-gold-cup.png', alt: 'gold-cup' },
  spectator: { src: '/assets/images/check.png', alt: 'green-check', style: { width: '100px', height: '100px' } },
};

function GameResultIcon({ userId, mode = 'default' }) {
  const players = useSelector(selectors.gamePlayersSelector);

  const opponent = find(players, ({ id }) => id !== userId);

  const resultUser1 = get(players, [userId, 'result']);
  const resultUser2 = get(players, [opponent?.Id, 'result']);

  const tooltipId = `tooltip-${resultUser1}`;
  const winIconProps = mapModeToWinImgProps[mode];

  if (resultUser1 === 'gave_up') {
    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>Player gave up</Tooltip>}
        placement="left"
      >
        <img
          src="/assets/images/big-flag.png"
          alt="white-flag"
          style={{ width: '200px' }}
        />
      </OverlayTrigger>
    );
  }

  if (resultUser1 === 'won' && resultUser2 !== 'gave_up') {
    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>Player won</Tooltip>}
        placement="left"
      >
        <img
          alt="empty win icon"
          {...winIconProps}
        />
      </OverlayTrigger>
    );
  }

  return null;
}

export default GameResultIcon;
