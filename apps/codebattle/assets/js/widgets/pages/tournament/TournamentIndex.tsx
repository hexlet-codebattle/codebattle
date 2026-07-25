import React, { useState } from 'react';

import cn from 'classnames';
import i18next from 'i18next';

import CreateTournament, { LastTournamentSettings } from './CreateTournament';
import { getBrowserTimezone } from './dateTime';
import MyTournaments from './MyTournaments';

type TabKey = 'create' | 'my';

export interface TournamentIndexProps {
  lastTournament?: LastTournamentSettings | null;
  taskPackNames?: string[];
  userTimezone?: string;
}

function TournamentIndex({
  lastTournament = null,
  taskPackNames = [],
  userTimezone = 'UTC',
}: TournamentIndexProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('create');
  const browserTimezone = getBrowserTimezone(userTimezone);

  return (
    <div className="cb-text mb-3">
      <div className="d-flex justify-content-center mb-4">
        <div className="cb-schedule-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            className={cn('cb-schedule-tab', { active: activeTab === 'create' })}
            onClick={() => setActiveTab('create')}
          >
            {i18next.t('Create tournament')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'my'}
            className={cn('cb-schedule-tab', { active: activeTab === 'my' })}
            onClick={() => setActiveTab('my')}
          >
            {i18next.t('My tournaments')}
          </button>
        </div>
      </div>

      <div className={cn({ 'd-none': activeTab !== 'create' })}>
        <CreateTournament
          lastTournament={lastTournament}
          taskPackNames={taskPackNames}
          userTimezone={browserTimezone}
          onSuccess={(tournament) => {
            window.location.href = `/tournaments/${tournament.id}`;
          }}
        />
      </div>

      <div className={cn({ 'd-none': activeTab !== 'my' })}>
        <MyTournaments isActive={activeTab === 'my'} userTimezone={browserTimezone} />
      </div>
    </div>
  );
}

export default TournamentIndex;
