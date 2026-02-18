import React, { useEffect, useCallback } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "react-bootstrap/Button";
import Popover from "react-bootstrap/Popover";
import { useDispatch, useSelector } from "react-redux";

import OverlayTrigger from "@/components/OverlayTriggerCompat";
import { unfollowUser, followUser } from "@/middlewares/Main";

import i18n from "../../i18n";
import { initInvites } from "../middlewares/Invite";
import initPresence from "../middlewares/Main";
import * as selectors from "../selectors";
import { actions } from "../slices";
import { selectors as invitesSelectors } from "../slices/invites";
import { isSafari } from "../utils/browser";

import InvitesList from "./InvitesList";

const fightSvg = "/assets/images/fight.svg";

function InvitesContainer() {
  const dispatch = useDispatch();

  const followId = useSelector((state) => state.gameUI.followId);
  const followPaused = useSelector((state) => state.gameUI.followPaused);
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const checkInvitePlayers = ({ creatorId, recipientId }) =>
    creatorId === currentUserId || recipientId === currentUserId;
  const filterInvites = (invite) => invite.state === "pending" && checkInvitePlayers(invite);
  const invites = useSelector(invitesSelectors.selectAll).filter(filterInvites);

  const handleUnfollowClick = useCallback(() => {
    dispatch(unfollowUser(followId));
  }, [dispatch, followId]);
  const togglePausedfollowClick = useCallback(() => {
    dispatch(actions.togglePausedFollow());

    if (followPaused) {
      dispatch(followUser(followId));
    }
  }, [dispatch, followPaused, followId]);

  useEffect(() => {
    dispatch(initInvites(currentUserId));
    const channel = initPresence(followId)(dispatch);

    return () => {
      channel.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect(() => {
  //   const inviteClasses = cn(
  //     'position-absolute invites-counter badge badge-danger',
  //     {
  //       'd-none': invites.length === 0 && !followId,
  //     },
  //   );
  //   const invitesCountElement = document.getElementById('invites-counter-id');
  //   invitesCountElement.classList.add(...inviteClasses.split(' '));
  //   invitesCountElement.textContent = invites.length;
  //
  //   return () => invitesCountElement.classList.remove(...inviteClasses.split(' '));
  // }, [invites.length, followId]);

  const defaultShow = invites.length !== 0 || undefined;

  return (
    <OverlayTrigger
      trigger={isSafari() ? "click" : "focus"}
      key="codebattle-invites"
      placement={invites.length === 0 ? "bottom-end" : "bottom"}
      show={defaultShow}
      overlay={
        <Popover id="popover-invites" className="cb-bg-panel cb-border-color cb-text cb-rounded">
          {followId && (
            <div className="d-flex justify-content-center align-items-center p-2">
              {i18n.t("You are following ID: %{followId}", { followId })}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded mx-1"
                onClick={togglePausedfollowClick}
              >
                <FontAwesomeIcon icon={followPaused ? "play" : "pause"} className="mr-1" />
                {followPaused ? i18n.t("Unpause") : i18n.t("Pause")}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger cb-rounded mx-1"
                onClick={handleUnfollowClick}
              >
                <FontAwesomeIcon icon="binoculars" className="mr-1" />
                {i18n.t("Unfollow")}
              </button>
            </div>
          )}
          <InvitesList followId={followId} list={invites} currentUserId={currentUserId} />
        </Popover>
      }
    >
      {({ ref, ...triggerHandler }) => (
        <Button {...triggerHandler} className="bg-transparent border-0 attachment mx-2">
          <img ref={ref} alt="invites" src={fightSvg} style={{ width: "46px", height: "46px" }} />
          {followId && (
            <span className="position-absolute badge badge-danger" style={{ top: "74%" }}>
              <FontAwesomeIcon icon={followPaused ? "pause" : "binoculars"} />
            </span>
          )}
          {invites.length !== 0 ? (
            <>
              <span className="position-absolute badge badge-danger">{invites.length}</span>
              <span className="sr-only">your`&apos;`s invites</span>
            </>
          ) : (
            <span className="sr-only">no invites</span>
          )}
        </Button>
      )}
    </OverlayTrigger>
  );
}

export default InvitesContainer;
