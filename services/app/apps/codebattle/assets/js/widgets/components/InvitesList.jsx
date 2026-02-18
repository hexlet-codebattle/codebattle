import React from "react";

import { useDispatch } from "react-redux";

import { acceptInvite, declineInvite, cancelInvite } from "../middlewares/Invite";

import GameLevelBadge from "./GameLevelBadge";

function NoInvites() {
  return <div className="p-2 text-center">No Invites</div>;
}

function InvitesList({ list, followId, currentUserId }) {
  const dispatch = useDispatch();

  if (followId && list.length === 0) {
    return <></>;
  }

  if (list.length === 0) {
    return <NoInvites />;
  }

  return list
    .sort(({ creatorId }) => creatorId === currentUserId)
    .map(({ id, creatorId, recipientId, creator, recipient, gameParams }) => (
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
              className="btn btn-outline-danger cb-rounded small px-1 mx-1"
              onClick={() => dispatch(acceptInvite(id, creator.name))}
            >
              Accept
            </button>
            <button
              type="submit"
              className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded small px-1 mx-1"
              onClick={() => dispatch(declineInvite(id, creator.name))}
            >
              Decline
            </button>
          </>
        )}
        {currentUserId === creatorId && (
          <>
            <span className="text-truncate small ml-2 mr-auto">
              {"You invited "}
              <span className="font-weight-bold mr-2">{recipient.name}</span>
            </span>
            <button
              type="submit"
              className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded small mx-1 px-1"
              onClick={() => dispatch(cancelInvite(id, recipient.name))}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    ));
}

export default InvitesList;
