import React, { useEffect } from 'react';
import { Popover, OverlayTrigger, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import cn from 'classnames';

import GameLevelBadge from './GameLevelBadge';
import * as selectors from '../selectors';
import { selectors as invitesSelectors } from '../slices/invites';
import {
  initInvites, acceptInvite, declineInvite, cancelInvite,
} from '../middlewares/Invite';
import initPresence from '../middlewares/Main';
import isSafari from '../utils/browser';

const NoInvites = () => (
  <div
    className="p-2"
  >
    No Invites
  </div>
);

function InvitesList({ list, currentUserId }) {
  const dispatch = useDispatch();

  return list
    .sort(({ creatorId }) => creatorId === currentUserId)
    .map(({
      id, creatorId, recipientId, creator, recipient, gameParams,
    }) => (
      <div key={id} className="d-flex align-items-center p-2">
        <div className="mx-1">
          <GameLevelBadge level={gameParams.level} />
        </div>
        {currentUserId === recipientId && (
          <>
            <span className="text-truncate small mx-2 mr-auto">
              <span className="font-weight-bold">{creator.name}</span>
              <span className="mr-2"> invited you</span>
            </span>
            <button
              type="submit"
              className="btn btn-outline-danger small px-1 mx-1"
              onClick={() => dispatch(acceptInvite(id, creator.name))}
            >
              Accept
            </button>
            <button
              type="submit"
              className="btn btn-outline-primary small px-1 mx-1"
              onClick={() => dispatch(declineInvite(id, creator.name))}
            >
              Decline
            </button>
          </>
        )}
        {currentUserId === creatorId && (
          <>
            <span className="text-truncate small ml-2 mr-auto">
              {'You invited '}
              <span className="font-weight-bold mr-2">{recipient.name}</span>
            </span>
            <button
              type="submit"
              className="btn btn-outline-primary small mx-1 px-1"
              onClick={() => dispatch(cancelInvite(id, recipient.name))}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    ));
}

function InvitesContainer() {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const checkInvitePlayers = ({ creatorId, recipientId }) => (creatorId === currentUserId || recipientId === currentUserId);
  const filterInvites = invite => invite.state === 'pending' && checkInvitePlayers(invite);
  const invites = useSelector(invitesSelectors.selectAll).filter(filterInvites);

  const dispatch = useDispatch();

  useEffect(() => {
    const user = Gon.getAsset('current_user');
    dispatch(initInvites(user));
    dispatch(initPresence());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const inviteClasses = cn('position-absolute invites-counter badge badge-danger', {
      'd-none': invites.length === 0,
    });
    const invitesCountElement = document.getElementById('invites-counter-id');
    invitesCountElement.classList.add(...inviteClasses.split(' '));
    invitesCountElement.textContent = invites.length;

    return () => invitesCountElement.classList.remove(...inviteClasses.split(' '));
  }, [invites.length]);

  return (
    <OverlayTrigger
      trigger={isSafari() ? 'click' : 'focus'}
      key="codebattle-invites"
      placement={invites.length === 0 ? 'bottom-end' : 'bottom'}
      overlay={(
        <Popover id="popover-invites" show={invites.length !== 0}>
          {invites.length === 0 ? <NoInvites /> : <InvitesList list={invites} currentUserId={currentUserId} />}
        </Popover>
      )}
    >
      {({ ref, ...triggerHandler }) => (
        <Button
          variant="dark"
          {...triggerHandler}
          className="attachment mx-2"
        >
          <img
            ref={ref}
            alt="invites"
            src="/assets/images/fight.svg"
            style={{ width: '46px', height: '46px' }}
          />
          {
            invites.length !== 0 ? (
              <>
                <span className="position-absolute badge badge-danger">{invites.length}</span>
                <span className="sr-only">{'your\'s invites'}</span>
              </>
            ) : <span className="sr-only">no invites</span>
          }
        </Button>
      )}
    </OverlayTrigger>
  );
}

export default InvitesContainer;
