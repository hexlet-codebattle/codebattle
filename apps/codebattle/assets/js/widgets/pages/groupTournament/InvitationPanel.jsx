import React from "react";

import i18n from "../../../i18n";

function InvitationPanel({ invite, onStart }) {
  const isAccepted = invite?.state === "accepted";

  return (
    <div className="container-fluid cb-main-wrapper py-5">
      <div className="container">
        <div className="text-center mb-5">
          <h1 className="display-4 font-weight-bold">{i18n.t("Group Tournament")}</h1>
        </div>

        <div className="row justify-content-center text-center my-5">
          <div className="col-md-3">
            <p className="small">
              {i18n.t("Task is solved in")}
              <br />
              <strong>SourceCraft</strong>
            </p>
          </div>
          <div className="col-md-3">
            <p className="small text-muted pt-2">{i18n.t("30 minutes to solve")}</p>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h5 className="mb-4 font-weight-bold">{i18n.t("Before you begin:")}</h5>

            <ul className="list-group cb-steps-list">
              <li className="cb-bg-secondary list-group-item d-flex justify-content-between align-items-center cb-step-item mt-2">
                <div className="d-flex align-items-center">
                  <span className="cb-step-num mr-3">1</span>
                  <span>{i18n.t("Join our SourceCraft organization to receive the task")}</span>
                </div>
                {isAccepted ? (
                  <button type="button" className="btn btn-success cb-btn-action rounded" disabled>
                    {i18n.t("Accepted")}
                  </button>
                ) : (
                  <a
                    target="_blank"
                    href={invite?.inviteLink}
                    className="btn btn-success cb-btn-action rounded"
                    rel="noopener noreferrer"
                  >
                    {i18n.t("Accept invitation")}
                  </a>
                )}
              </li>

              <li className="cb-bg-secondary list-group-item d-flex justify-content-between align-items-center cb-step-item mt-2">
                <div className="d-flex align-items-center">
                  <span className="cb-step-num mr-3">2</span>
                  <span>{i18n.t("Once all steps are complete, you can start solving")}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-success cb-btn-action rounded"
                  onClick={onStart}
                  disabled={!isAccepted}
                >
                  {i18n.t("Go to task")}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvitationPanel;
