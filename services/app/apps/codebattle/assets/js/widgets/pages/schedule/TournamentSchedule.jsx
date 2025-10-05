import React, { useEffect, useState } from 'react';

import cn from 'classnames';
import { useSelector } from 'react-redux';

import { currentUserIsAdminSelector } from '@/selectors';

import i18n from '../../../i18n';
import TournamentListItem, { activeIcon } from '../lobby/TournamentListItem';

const states = [
  '#contest',
  '#my',
  '#all',
];

const getStateFromHash = () => {
  const { hash } = window.location;
  console.log(hash);

  if (states.includes(hash)) {
    return hash;
  }

  return states[0];
};

const TournamentSchedule = () => {
  const [context, setContext] = useState(getStateFromHash);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const isAdmin = useSelector(currentUserIsAdminSelector);

  const sectionBtnClassName = cn('btn btn-secondary border-0 cb-btn-secondary cb-rounded');
  const onChangeContext = event => {
    event.preventDefault();

    try {
      setLoading(true);
      if (event.currentTarget.dataset.context && states.includes(event.currentTarget.dataset.context)) {
        const { context: newContext } = event.currentTarget.dataset;
        window.location.hash = newContext;
        setContext(newContext);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && context === '#all') {
      setContext('#contest');
      return;
    }

    if (context === '#contest') {
      setTournaments([]);
      setLoading(false);
    } else if (context === '#my') {
      setTournaments([]);
      setLoading(false);
    } else if (context === '#all') {
      setTournaments([]);
      setLoading(false);
    }
  }, [context]);

  return (
    <div className="d-flex flex-column cb-rounded cb-bg-panel p-2">
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className={sectionBtnClassName}
          data-context="#contest"
          onClick={onChangeContext}
          disabled={context === '#contest' || loading}
        >
          {i18n.t('Contest Tournaments')}
        </button>
        <button
          type="button"
          className={sectionBtnClassName}
          data-context="#my"
          onClick={onChangeContext}
          disabled={context === '#my' || loading}
        >
          {i18n.t('My Tournaments')}
        </button>
        {isAdmin && (
          <button
            type="button"
            className={sectionBtnClassName}
            data-context="#all"
            onClick={onChangeContext}
            disabled={context === '#all' || loading}
          >
            {i18n.t('All Tournaments')}
          </button>
        )}
      </div>
      <div className="cb-separator" />
      <div className="d-flex flex-column mt-2">
        {tournaments.map(t => <TournamentListItem tournament={t} icon={activeIcon} />)}
      </div>
    </div>
  );
};

export default TournamentSchedule;
