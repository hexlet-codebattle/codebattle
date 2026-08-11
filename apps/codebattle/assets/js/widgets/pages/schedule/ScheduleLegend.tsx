import React from 'react';

import { Flex, Stack } from '@mantine/core';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import { grades } from '@/config/grades';

import i18n from '../../../i18n';
import { currentUserIsAdminSelector } from '@/selectors';

export const states = {
  contest: '#contest',
  my: '#my',
  list: '#list',
  all: '#all',
};

export type ScheduleContext = (typeof states)[keyof typeof states];

interface TabConfig {
  context: ScheduleContext;
  label: string;
  adminOnly?: boolean;
}

const tabs: TabConfig[] = [
  { context: states.contest, label: 'Calendar' },
  { context: states.list, label: 'History' },
  { context: states.my, label: 'My Tournaments' },
  { context: states.all, label: 'All Tournaments', adminOnly: true },
];

const gradeLegend: { grade: string; label: string }[] = [
  { grade: grades.rookie, label: 'Rookie' },
  { grade: grades.challenger, label: 'Challenger' },
  { grade: grades.pro, label: 'Pro' },
  { grade: grades.elite, label: 'Elite' },
  { grade: grades.masters, label: 'Masters' },
  { grade: grades.grandSlam, label: 'Grand Slam' },
];

interface ScheduleLegendProps {
  context: ScheduleContext;
  loading: boolean;
  onChangeContext: React.MouseEventHandler<HTMLButtonElement>;
}

function ScheduleLegend({ onChangeContext, loading, context }: ScheduleLegendProps) {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <Stack align="center" gap="md" p="xs" pb="lg">
      <div className="cb-schedule-tabs" role="tablist">
        {tabs
          .filter((tab) => !tab.adminOnly || isAdmin)
          .map((tab) => (
            <button
              key={tab.context}
              type="button"
              role="tab"
              aria-selected={context === tab.context}
              className={cn('cb-schedule-tab', {
                active: context === tab.context,
              })}
              data-context={tab.context}
              onClick={onChangeContext}
              disabled={loading}
            >
              {i18n.t(tab.label)}
            </button>
          ))}
      </div>
      <Flex wrap="wrap" justify="center" className="cb-schedule-grade-legend">
        {gradeLegend.map(({ grade, label }) => (
          <Flex key={grade} component="span" align="center" className="cb-schedule-grade-item">
            <span
              className="cb-schedule-grade-dot"
              style={{ backgroundColor: `var(--cb-grade-${grade})` }}
            />
            {i18n.t(label)}
          </Flex>
        ))}
      </Flex>
    </Stack>
  );
}

export default ScheduleLegend;
