import React from "react";

import i18n from "../../../i18n";

function InvitationPanel({ name, meta, invite, onStart }) {
  const isAccepted = invite?.state === "accepted";
  const m = meta || {};

  const taskInfoLabel = m.taskInfoLabel || i18n.t("Task is solved in SourceCraft");
  const taskInfoIconUrl = m.taskInfoIconUrl || null;
  const taskDurationLabel = m.taskDurationLabel || i18n.t("30 minutes to solve");
  const taskDurationIconUrl = m.taskDurationIconUrl || null;
  const stepsTitle = m.stepsTitle || i18n.t("Before you begin:");
  const step1Label =
    m.step1Label || i18n.t("Join our SourceCraft organization to receive the task");
  const step1ButtonLabel = m.step1ButtonLabel || i18n.t("Accept invitation");
  const step2Label = m.step2Label || i18n.t("Once all steps are complete, you can start solving");
  const step2ButtonLabel = m.step2ButtonLabel || i18n.t("Go to task");

  return (
    <div className="container-fluid cb-main-wrapper py-5">
      <div className="container">
        <div className="text-center mb-5">
          <h1 className="display-4 font-weight-bold">{name || i18n.t("Group Tournament")}</h1>
        </div>

        <div className="row justify-content-center text-center my-5">
          <div className="col-md-3">
            {taskInfoIconUrl && (
              <img
                src={taskInfoIconUrl}
                alt=""
                className="cb-invitation-icon mb-2"
                style={{ width: 48, height: 48, objectFit: "contain" }}
              />
            )}
            <p className="small">{taskInfoLabel}</p>
          </div>
          <div className="col-md-3">
            {taskDurationIconUrl && (
              <img
                src={taskDurationIconUrl}
                alt=""
                className="cb-invitation-icon mb-2"
                style={{ width: 48, height: 48, objectFit: "contain" }}
              />
            )}
            <p className="small text-muted pt-2">{taskDurationLabel}</p>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h5 className="mb-4 font-weight-bold">{stepsTitle}</h5>

            <ul className="list-group cb-steps-list">
              <li className="cb-bg-secondary list-group-item d-flex justify-content-between align-items-center cb-step-item mt-2">
                <div className="d-flex align-items-center">
                  <span className="cb-step-num mr-3">1</span>
                  <span>{step1Label}</span>
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
                    {step1ButtonLabel}
                  </a>
                )}
              </li>

              <li className="cb-bg-secondary list-group-item d-flex justify-content-between align-items-center cb-step-item mt-2">
                <div className="d-flex align-items-center">
                  <span className="cb-step-num mr-3">2</span>
                  <span>{step2Label}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-success cb-btn-action rounded"
                  onClick={onStart}
                  disabled={!isAccepted}
                >
                  {step2ButtonLabel}
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
