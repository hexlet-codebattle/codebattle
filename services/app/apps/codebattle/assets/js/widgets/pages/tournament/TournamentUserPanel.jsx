import React, {
  memo,
  useCallback,
  useEffect,
  useContext,
  useState,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Collapse from 'react-bootstrap/Collapse';
import { useDispatch, useSelector } from 'react-redux';

import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import { requestMatchesByPlayerId } from '@/middlewares/Tournament';
import {
  currentUserIsAdminSelector,
  currentUserIsTournamentOwnerSelector,
} from '@/selectors';

// import TournamentPlace from './TournamentPlace';
import UsersMatchList from './UsersMatchList';

function TournamentUserPanel({
  matches,
  currentUserId,
  userId,
  name,
  score,
  // place,
  isBanned = false,
  // localPlace,
  searchedUserId = 0,
  hideBots,
}) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  const isAdmin = useSelector(currentUserIsAdminSelector);
  const isOwner = useSelector(currentUserIsTournamentOwnerSelector);
  const canModerate = isAdmin || isOwner;

  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const searchBadge = cn('badge mr-2', {
    'badge-primary': !hasCustomEventStyles,
    'cb-custom-event-badge-primary': hasCustomEventStyles,
  });
  const playerBadge = cn('badge text-white mr-2', {
    'badge-success': !hasCustomEventStyles,
    'cb-custom-event-badge-success': hasCustomEventStyles,
  });
  const panelClassName = cn(
    'd-flex flex-column border cb-border-color shadow-sm rounded-lg mb-2 overflow-auto',
    hasCustomEventStyles
      ? {
        'cb-custom-event-border-success': userId === currentUserId,
        'cb-custom-event-border-info': userId === searchedUserId,
      }
      : {
        'border-success': userId === currentUserId,
        'border-primary': userId === searchedUserId,
      },
  );

  const titleClassName = cn(
    'd-flex align-items-center justify-content-start px-2 py-1',
  );

  const handleOpenMatches = useCallback(
    event => {
      event.preventDefault();
      if (!open && userId !== currentUserId) {
        dispatch(requestMatchesByPlayerId(userId));
      }

      setOpen(!open);
    },
    [open, setOpen, dispatch, userId, currentUserId],
  );

  useEffect(() => {
    if (open) {
      dispatch(requestMatchesByPlayerId(userId));
    }
  }, [open, dispatch, userId]);

  return (
    <div className={panelClassName}>
      <div
        className={titleClassName}
        onClick={handleOpenMatches}
        aria-hidden
        aria-expanded={open}
        aria-controls={`collapse-matches-${userId}`}
      >
        <div className="d-flex">
          <div className="d-flex flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-row">
            <div>
              <span className="text-nowrap" title={name}>
                {searchedUserId === userId && (
                  <span className={searchBadge}>Search</span>
                )}
                {currentUserId === userId && (
                  <span className={playerBadge}>you</span>
                )}
                {name}
              </span>
              {isBanned && (
                <FontAwesomeIcon className="ml-2 text-danger" icon="ban" />
              )}
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
              {/* {place !== undefined && ( */}
              {/*   <> */}
              {/*     <span className="mx-1">|</span> */}
              {/*     <span title="Place on tournament"> */}
              {/*       <TournamentPlace place={place + 1} withIcon /> */}
              {/*     </span> */}
              {/*   </> */}
              {/* )} */}
              {/* {localPlace && ( */}
              {/*   <> */}
              {/*     <span className="mx-1">|</span> */}
              {/*     <span title="Place on local group"> */}
              {/*       <FontAwesomeIcon className="text-secondary" icon="trophy" /> */}
              {/*       {': '} */}
              {/*       {localPlace} */}
              {/*     </span> */}
              {/*   </> */}
              {/* )} */}
            </div>
          </div>
        </div>
        <div className="d-flex ml-1">
          <button type="button" className="btn" onClick={handleOpenMatches}>
            <FontAwesomeIcon className="cb-text" icon={open ? 'chevron-up' : 'chevron-down'} />
          </button>
        </div>
      </div>
      <Collapse in={open}>
        <div id="collapse-matches-one" className="border-top cb-border-color">
          <UsersMatchList
            currentUserId={currentUserId}
            playerId={userId}
            matches={matches}
            isBanned={isBanned}
            canBan={canModerate && userId !== currentUserId}
            canModerate={canModerate}
            hideBots={hideBots}
          />
        </div>
      </Collapse>
    </div>
  );
}

export default memo(TournamentUserPanel);
