import React from 'react';
import cn from 'classnames';
import { Button } from '@mantine/core';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// Replacement for the Bootstrap `btn btn-sm rounded-pill` tab pills used by the
// leaderboard and main-panel tab rows. Keeps the `cb-tab-btn` design classes
// (unlayered `!important` background wins over Mantine); the inactive 50%-white
// text is inlined so the class-level `cb-tab-btn:hover { color:#fff!important }`
// still wins on hover.
const TabButton = ({ active, onClick, children }: TabButtonProps) => (
  <Button
    type="button"
    variant="subtle"
    size="sm"
    radius="xl"
    px="lg"
    py="sm"
    mr="sm"
    my="xs"
    className={cn('cb-tab-btn', { 'cb-tab-btn--active': active })}
    style={{
      color: active ? '#fff' : 'rgba(255, 255, 255, 0.5)',
      borderBottom: active ? '3px solid #3182ce' : '3px solid transparent',
      transition: 'all 0.2s ease-in-out',
    }}
    onClick={onClick}
  >
    {children}
  </Button>
);

export default TabButton;
