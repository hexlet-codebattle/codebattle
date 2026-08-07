import React, { type ReactNode } from 'react';

import { faFlag } from '@fortawesome/free-regular-svg-icons';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tooltip } from '@mantine/core';

type ResultIconName = 'gaveUp' | 'won';

interface ResultIconData {
  name: ResultIconName;
  tooltip: {
    id: string;
    text: ReactNode;
  };
}

interface ResultIconProps {
  icon?: ResultIconData | null;
}

const iconRenderers: Record<ResultIconName, () => ReactNode> = {
  gaveUp: () => <FontAwesomeIcon icon={faFlag} className="mr-2" transform="grow-1.25" />,
  won: () => (
    <FontAwesomeIcon icon={faTrophy} className="mr-2 text-warning" transform="grow-1.25" />
  ),
};

function ResultIcon({ icon = null }: ResultIconProps) {
  if (icon === null) return null;

  const renderIcon = iconRenderers[icon.name];

  return (
    <Tooltip label={icon.tooltip.text} position="left" withArrow>
      {renderIcon()}
    </Tooltip>
  );
}

export default ResultIcon;
