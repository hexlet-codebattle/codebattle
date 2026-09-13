import React, { type ReactNode } from 'react';

import { faFlag } from '@fortawesome/free-regular-svg-icons';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Tooltip } from '@mantine/core';

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
  gaveUp: () => (
    <Box component="span" mr="sm">
      <FontAwesomeIcon icon={faFlag} transform="grow-1.25" />
    </Box>
  ),
  won: () => (
    <Box component="span" mr="sm" c="yellow">
      <FontAwesomeIcon icon={faTrophy} transform="grow-1.25" />
    </Box>
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
