// Hover-triggered popover that stays open while the pointer is over the dropdown.
// Backed by Mantine HoverCard (was react-bootstrap Overlay + Popover).
import React, { type ReactNode } from 'react';

import { HoverCard, type FloatingPosition } from '@mantine/core';

export type Placement = FloatingPosition;

interface PopoverStickOnHoverProps {
  id: string;
  delay?: number;
  onMouseEnter?: () => void;
  children: ReactNode;
  component: ReactNode;
  placement?: Placement;
}

function PopoverStickOnHover({
  id,
  delay = 0,
  onMouseEnter,
  children,
  component,
  placement = 'bottom',
}: PopoverStickOnHoverProps) {
  return (
    <HoverCard
      openDelay={delay}
      position={placement}
      onOpen={onMouseEnter}
      withinPortal
      shadow="md"
      radius="md"
    >
      <HoverCard.Target>{children}</HoverCard.Target>
      <HoverCard.Dropdown id={id} className="cb-blur cb-text cb-rounded" p={0}>
        {component}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

export default PopoverStickOnHover;
