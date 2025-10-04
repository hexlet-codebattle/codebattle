import React, { useEffect, useState } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { currentUserIsAdminSelector } from '@/selectors';

import i18n from '../../../i18n';
import TournamentListItem, { activeIcon } from '../lobby/TournamentListItem';

const states = [
  'contest',
  'my',
  'all',
];

const getStateFromHash = () => {
  const { hash } = window.location;

  if (states.includes(hash)) {
    return hash;
  }

  return states[0];
};

const TournamentSchedule = () => {
  const [context, setContext] = useState(getStateFromHash());
  const [tournaments, setTournaments] = useState([]);
  const isAdmin = useSelector(currentUserIsAdminSelector);

  const sectionBtnClassName = cn('btn btn-secondary cb-btn-secondary w-100');
  const onChangeContext = event => {
    event.preventDefault();

    if (event.dataset.context && states.includes(event.dataset.context)) {
      const { context: newContext } = event.dataset;
      window.location.hash = newContext;
      setContext(newContext);
    }
  };

  useEffect(() => {
    setTournaments([]);
  }, [context]);

  return (
    <div className="d-flex cb-rounded cb-bg-panel">
      <div className="d-flex">
        <button
          type="button"
          className={sectionBtnClassName}
          data-context="contest"
          onClick={onChangeContext}
          disabled={context === 'contest'}
        >
          {i18n.t('Contest Tournaments')}
        </button>
        <button
          type="button"
          className={sectionBtnClassName}
          data-context="my"
          onClick={onChangeContext}
          disabled={context === 'my'}
        >
          {i18n.t('My Tournaments')}
        </button>
        {isAdmin && (
          <button
            type="button"
            className={sectionBtnClassName}
            data-context="all"
            onClick={onChangeContext}
            disabled={context === 'all'}
          >
            {i18n.t('All Tournaments')}
          </button>
        )}
      </div>
      <div className="d-flex flex-column mt-2">
        {tournaments.map(t => <TournamentListItem tournament={t} icon={activeIcon} />)}
      </div>
    </div>
  );
};

export default TournamentSchedule;
