import React from "react";

import i18n from "../../../i18n";

function InvitationPanel({ invite, requestInviteUpdates }) {
  const isPending =
    invite.state === "creating" || invite.state === "pending" || invite.state === "loading";
  const isFailed = invite.state === "failed";

  return (
    <div className="container-fluid h-100">
      <div className="row justify-content-center h-100">
        <div className="col-lg-5 col-md-6 col-sm-8 px-md-4 align-content-center">
          <div className="cb-bg-panel shadow-sm cb-rounded p-5">
            <p className="text-center cb-text mb-4">
              {i18n.t("You need to accept an invitation to participate in this tournament.")}
            </p>
            {isPending && !invite.inviteLink && (
              <div className="text-center cb-text mb-3">{i18n.t("Preparing your invite...")}</div>
            )}
            {isFailed && (
              <div className="text-center text-danger mb-3">
                {i18n.t("Invite failed. Please try again.")}
              </div>
            )}
            <div className="d-flex flex-column align-items-center gap-3">
              {invite.inviteLink && (
                <a
                  href={invite.inviteLink}
                  className="btn btn-lg btn-success cb-rounded w-100"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {i18n.t("Accept Invite")}
                </a>
              )}
              {isFailed ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded w-100"
                  onClick={requestInviteUpdates}
                >
                  {i18n.t("Retry")}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded w-100"
                  onClick={requestInviteUpdates}
                >
                  {i18n.t("Check Status")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvitationPanel;
