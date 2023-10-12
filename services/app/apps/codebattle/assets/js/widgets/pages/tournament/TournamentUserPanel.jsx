import React, {
  memo, useState,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Collapse from 'react-bootstrap/Collapse';

import UsersMatchList from './UsersMatchList';

function TournamentUserPanel({
  matches,
  currentUserId,
  userId,
  name,
  score,
  rank,
  searchedUserId = 0,
}) {
  const [open, setOpen] = useState(true);

  const panelClassName = cn(
    'd-flex flex-column border shadow-sm rounded-lg mb-2',
    {
      'border-success': userId === currentUserId,
      'border-primary': userId === searchedUserId,
    },
  );

  return (
    <div className={panelClassName}>
      <div
        className="btn d-flex align-items-center justify-content-between"
        onClick={() => setOpen(!open)}
        aria-hidden
        aria-expanded={open}
        aria-controls={`collapse-matches-${userId}`}
      >
        <div className="d-flex">
          <div className="d-flex flex-column flex-lg-row flex-md-row flex-sm-row">
            <div>
              <span className="text-nowrap" title={name}>
                {name}
                {currentUserId === userId && '(you)'}
              </span>
              <span className="d-none d-sm-inline d-md-inline d-lg-inline mx-1">
                |
              </span>
            </div>
            <div className="d-flex align-items-center text-nowrap">
              <span title="Score" className="text-nowrap">
                <FontAwesomeIcon className="text-warning" icon="star" />
                {': '}
                {score}
              </span>
              {rank && (
                <>
                  <span className="mx-1">|</span>
                  <span title="Players place">
                    <FontAwesomeIcon className="text-warning" icon="trophy" />
                    {': '}
                    {rank}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={event => {
            event.preventDefault();
            setOpen(!open);
          }}
        >
          <FontAwesomeIcon icon={open ? 'chevron-up' : 'chevron-down'} />
        </button>
      </div>
      <Collapse in={open}>
        <div id="collapse-matches-one" className="border-top">
          <UsersMatchList currentUserId={currentUserId} matches={matches} />
        </div>
      </Collapse>
    </div>
  );
}

export default memo(TournamentUserPanel);
