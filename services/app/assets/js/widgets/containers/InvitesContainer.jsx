import React, { useEffect } from 'react';
import { Popover, OverlayTrigger, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';

import GameLevelBadge from '../components/GameLevelBadge';
import * as selectors from '../selectors';
import { actions } from '../slices';
import {
  init, acceptInvite, declineInvite, cancelInvite,
} from '../middlewares/Main';

const NoInvites = () => (
  <div
    className="p-2"
  >
    No Invites
  </div>
);

const InvitesList = ({ list, currentUserId }) => {
  const dispatch = useDispatch();

  return list
    .sort(({ creatorId }) => creatorId === currentUserId)
    .map(({
      id, creatorId, recepientId, creator, recepient, gameParams,
    }) => (
      <div key={id} className="d-flex align-items-center justify-content-between p-2">
        <div className="mx-1">
          <GameLevelBadge level={gameParams.level} />
        </div>
        {currentUserId === recepientId && (
          <>
            <span className="text-truncate small mx-2">{`${creator.name} invited you`}</span>
            <button
              type="submit"
              className="btn btn-outline-danger small px-1 mx-1"
              onClick={() => dispatch(acceptInvite(id))}
            >
              Accept
            </button>
            <button
              type="submit"
              className="btn btn-outline-primary small px-1 mx-1"
              onClick={() => dispatch(declineInvite(id))}
            >
              Decline
            </button>
          </>
        )}
        {currentUserId === creatorId && (
          <>
            <span className="text-truncate small mx-2">{`${recepient.name} you invite`}</span>
            <button
              type="submit"
              className="btn btn-outline-primary small mx-1 px-1"
              onClick={() => dispatch(cancelInvite(id))}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    ));
};

const InvitesContainer = () => {
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const checkInvitePlayers = ({ creatorId, recepientId }) => (creatorId === currentUserId || recepientId === currentUserId);
  const filterInvites = invite => invite.state === 'pending' && checkInvitePlayers(invite);
  const invites = useSelector(state => state.invites.list).filter(filterInvites);

  const dispatch = useDispatch();

  useEffect(() => {
    const user = Gon.getAsset('current_user');
    dispatch(actions.setCurrentUser({ user }));
    dispatch(init());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <OverlayTrigger
      trigger="click"
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
};

export default InvitesContainer;
