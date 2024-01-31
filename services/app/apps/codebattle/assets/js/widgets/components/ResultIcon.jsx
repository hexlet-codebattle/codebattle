import React from 'react';

import { faFlag } from '@fortawesome/free-regular-svg-icons';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

const iconRenderers = {
  gaveUp: () => <FontAwesomeIcon icon={faFlag} className="mr-2" transform="grow-1.25" />,
  won: () => <FontAwesomeIcon icon={faTrophy} className="mr-2 text-warning" transform="grow-1.25" />,
};

const ResultIcon = ({ icon = null }) => {
  if (icon === null) return null;

  const renderIcon = iconRenderers[icon.name];

  return (
    <OverlayTrigger
      overlay={<Tooltip id={icon.tooltip.id}>{icon.tooltip.text}</Tooltip>}
      placement="left"
    >
      {renderIcon()}
    </OverlayTrigger>
  );
};

export default ResultIcon;
