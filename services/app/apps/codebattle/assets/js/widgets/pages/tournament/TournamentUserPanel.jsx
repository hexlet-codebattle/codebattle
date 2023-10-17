import React, {
  memo, useCallback, useState,
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
  place,
  localPlace,
  searchedUserId = 0,
}) {
  const disabled = searchedUserId === userId || currentUserId === userId;
  const [open, setOpen] = useState(disabled);

  const panelClassName = cn(
    'd-flex flex-column border shadow-sm rounded-lg mb-2 overflow-auto',
    {
      'border-success': userId === currentUserId,
      'border-primary': userId === searchedUserId,
    },
  );

  const titleClassName = cn(
    'd-flex align-items-center justify-content-between',
    {
      btn: !disabled,
    },
    'px-2 py-1',
  );

  const handleClick = useCallback(event => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    setOpen(!open);
  }, [open, setOpen, disabled]);

  return (
    <div className={panelClassName}>
      <div
        className={titleClassName}
        onClick={handleClick}
        aria-hidden
        aria-expanded={open}
        aria-controls={`collapse-matches-${userId}`}
      >
        <div className="d-flex">
          <div className="d-flex flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-row">
            <div>
              <span className="text-nowrap" title={name}>
                {searchedUserId === userId && (<span className="badge badge-primary mr-2">Search</span>)}
                {currentUserId === userId && (<span className="badge badge-success text-white mr-2">you</span>)}
                {name}
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
              {place && (
                <>
                  <span className="mx-1">|</span>
                  <span title="Place on tournament">
                    <FontAwesomeIcon className="text-warning" icon="trophy" />
                    {': '}
                    {place}
                  </span>
                </>
              )}
              {localPlace && (
                <>
                  <span className="mx-1">|</span>
                  <span title="Place on local group">
                    <FontAwesomeIcon className="text-secondary" icon="trophy" />
                    {': '}
                    {localPlace}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={handleClick}
          disabled={disabled}
        >
          <FontAwesomeIcon className={disabled ? 'text-muted' : ''} icon={open ? 'chevron-up' : 'chevron-down'} />
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
