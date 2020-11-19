import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import * as selectors from '../selectors';

const GameResultIcon = ({ editor: { userId } }) => {
  const players = useSelector(selectors.gamePlayersSelector);

  const { id: opponentId } = _.find(players, ({ id }) => id !== userId);

  const resultUser1 = _.get(players, [userId, 'gameResult']);
  const resultUser2 = _.get(players, [opponentId, 'gameResult']);

  const tooltipId = `tooltip-${resultUser1}`;

  if (resultUser1 === 'gave_up') {
    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>Player gave up</Tooltip>}
        placement="left"
      >
        <div className="mx-1">
          <i className="far fa-flag fa-lg align-middle" aria-hidden="true" />
        </div>
      </OverlayTrigger>
    );
  }

  if (resultUser1 === 'won' && resultUser2 !== 'gave_up') {
    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>Player won</Tooltip>}
        placement="left"
      >
        <div className="mx-1">
          <i className="fa fa-trophy fa-lg text-warning align-middle" aria-hidden="true" />
        </div>
      </OverlayTrigger>
    );
  }

  return null;
};

export default GameResultIcon;
