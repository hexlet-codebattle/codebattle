import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';

import * as selectors from '../selectors';
import { actions } from '../slices';
import {
  init, acceptInvite, declineInvite, cancelInvite,
} from '../middlewares/Main';

const NoInvites = () => (
  <div
    className="dropdown-item d-flex-align-items-center justify-content-between"
  >
    No Invites
  </div>
);

const InvitesList = ({ list, currentUserId }) => (
  list
  .map(({
    id, state, creatorId, recepientId,
  }) => (
    <div key={id} className="dropdown-item">
      <span className="small mx-1">{`id: ${id}, state: ${state}`}</span>
      {currentUserId === creatorId && (
        <>
          <button
            type="submit"
            className="btn btn-primary small ml-1"
            onClick={() => acceptInvite(id)}
          >
            Accept
          </button>
          <button
            type="submit"
            className="btn btn-primary small ml-1"
            onClick={() => declineInvite(id)}
          >
            Decline
          </button>
        </>
      )}
      {currentUserId === recepientId && (
        <>
          <button
            type="submit"
            className="btn btn-primary small ml-1"
            onClick={() => cancelInvite(id)}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  ))
);

const InvitesContainer = () => {
  const dispatch = useDispatch();

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const checkInvitePlayers = ({ creatorId, recepientId }) => (creatorId === currentUserId || recepientId === currentUserId);
  const filterInvites = invite => invite.state === 'pending' && checkInvitePlayers(invite);
  const invites = useSelector(state => state.invites.list.filter(filterInvites));

  useEffect(() => {
    const user = Gon.getAsset('current_user');
    dispatch(actions.setCurrentUser({ user }));
    dispatch(init());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="nav-link noborder d-flex px-0"
      aria-expanded="false"
      aria-haspopup="true"
      data-toggle="dropdown"
    >
      <div
        className="d-flex flex-column mr-2"
      >
        <img
          className="attachment ml-1"
          alt="invites"
          src="/assets/images/fight.svg"
          style={{ width: '46px', height: '46px' }}
        />
        <div
          className="dropdown-menu dropdown-menu-right"
        >
          {invites.length === 0 ? <NoInvites /> : <InvitesList list={invites} currentUserId={currentUserId} />}
        </div>
      </div>
    </div>
  );
};

export default InvitesContainer;
