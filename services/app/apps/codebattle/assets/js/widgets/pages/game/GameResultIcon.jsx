import React from 'react';

import find from 'lodash/find';
import get from 'lodash/get';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useSelector } from 'react-redux';

import * as selectors from '../../selectors';

function GameResultIcon({ editor: { userId } }) {
  const players = useSelector(selectors.gamePlayersSelector);

  const { id: opponentId } = find(players, ({ id }) => id !== userId);

  const resultUser1 = get(players, [userId, 'result']);
  const resultUser2 = get(players, [opponentId, 'result']);

  const tooltipId = `tooltip-${resultUser1}`;

  if (resultUser1 === 'gave_up') {
    return (
      <OverlayTrigger overlay={<Tooltip id={tooltipId}>Player gave up</Tooltip>} placement="left">
        <img alt="white-flag" src="/assets/images/big-flag.png" style={{ width: '200px' }} />
      </OverlayTrigger>
    );
  }

  if (resultUser1 === 'won' && resultUser2 !== 'gave_up') {
    return (
      <OverlayTrigger overlay={<Tooltip id={tooltipId}>Player won</Tooltip>} placement="left">
        <img alt="gold-cup" src="/assets/images/big-gold-cup.png" />
      </OverlayTrigger>
    );
  }

  return null;
}

export default GameResultIcon;
