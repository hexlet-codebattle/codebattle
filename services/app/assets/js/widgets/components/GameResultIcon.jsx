import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

export default ({ resultUser1, resultUser2, className }) => {
  const tooltipId = `tooltip-${resultUser1}`;

  if (resultUser1 === 'gave_up') {
    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>Player gave up</Tooltip>}
        placement="left"
      >
        <div className={className}>
          <i className="fa fa-flag-o fa-lg align-middle" aria-hidden="true" />
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
        <div className={className}>
          <i className="fa fa-trophy fa-lg text-warning align-middle" aria-hidden="true" />
        </div>
      </OverlayTrigger>
    );
  }

  return null;
};
