import React from 'react';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

function ResultIcon({ gameId, player1, player2 }) {
  const tooltipId = `tooltip-${gameId}-${player1.id}`;

  if (player1.result === 'gave_up') {
    return (
      <OverlayTrigger overlay={<Tooltip id={tooltipId}>Player gave up</Tooltip>} placement="left">
        <span className="align-middle mr-1">
          <i aria-hidden="true" className="far fa-flag" />
        </span>
      </OverlayTrigger>
    );
  }

  if (player1.result === 'won' && player2.result !== 'gave_up') {
    return (
      <OverlayTrigger overlay={<Tooltip id={tooltipId}>Player won</Tooltip>} placement="left">
        <span className="align-middle mr-1">
          <i aria-hidden="true" className="fa fa-trophy text-warning" />
        </span>
      </OverlayTrigger>
    );
  }

  return (
    <span className="align-middle mr-1">
      <i className="fa x-opacity-0">&nbsp;</i>
    </span>
  );
}

export default ResultIcon;
