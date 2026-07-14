import React from 'react';

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
    <div className="d-flex flex-column align-items-center gap-3 p-1 pb-4">
      <div className="cb-schedule-tabs" role="tablist">
        {tabs
          .filter((tab) => !tab.adminOnly || isAdmin)
          .map((tab) => (
            <button
              key={tab.context}
              type="button"
              role="tab"
              aria-selected={context === tab.context}
              className={cn('cb-schedule-tab', { active: context === tab.context })}
              data-context={tab.context}
              onClick={onChangeContext}
              disabled={loading}
            >
              {i18n.t(tab.label)}
            </button>
          ))}
      </div>
      <div className="cb-schedule-grade-legend d-flex flex-wrap justify-content-center">
        {gradeLegend.map(({ grade, label }) => (
          <span key={grade} className="cb-schedule-grade-item d-inline-flex align-items-center">
            <span
              className="cb-schedule-grade-dot"
              style={{ backgroundColor: `var(--cb-grade-${grade})` }}
            />
            {i18n.t(label)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ScheduleLegend;
