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
    <div className="container-fluid position-relative overflow-hidden min-vh-100">
      <div className="cup cup-aside" />
      <div className="cb-custom-event-content d-flex flex-column mx-auto w-100">
        <div className="row my-5">
          <div className="col-12 d-flex justify-content-center">
            <h1 className="text-white text-center cb-custom-event-title">
              {(name || i18n.t("Group Tournament")).toUpperCase()}
            </h1>
          </div>
          <div className="col-12 d-flex justify-content-center mt-3">
            <p className="text-white text-center mb-0">
              {i18n.t("Find tournament details at")}{" "}
              <a
                className="text-white text-decoration-underline"
                href="https://universitybattle.ru/tournaments/2026"
                target="_blank"
                rel="noopener noreferrer"
              >
                universitybattle.ru/tournaments/2026
              </a>
            </p>
          </div>
        </div>

        <div className="row justify-content-center text-center my-4">
          <div className="col-auto px-4 d-flex flex-column align-items-center">
            {taskInfoIconUrl && (
              <img
                src={taskInfoIconUrl}
                alt=""
                style={{ width: 48, height: 48, objectFit: "contain" }}
              />
            )}
            <p className="text-white small mt-2 mb-0">{taskInfoLabel}</p>
          </div>
          <div className="col-auto px-4 d-flex flex-column align-items-center">
            {taskDurationIconUrl && (
              <img
                src={taskDurationIconUrl}
                alt=""
                style={{ width: 48, height: 48, objectFit: "contain" }}
              />
            )}
            <p className="text-white small mt-2 mb-0">{taskDurationLabel}</p>
          </div>
        </div>

        <div className="row justify-content-center my-3">
          <div className="col-12 col-lg-9">
            <h3 className="text-white text-center font-weight-bold mb-4">{stepsTitle}</h3>

            <div className="cb-custom-event-profile d-flex justify-content-between align-items-center my-3">
              <span className="text-white">{step1Label}</span>
              {isAccepted ? (
                <button type="button" className="btn btn-yellow rounded-pill px-4" disabled>
                  {i18n.t("Accepted")}
                </button>
              ) : invite?.inviteLink ? (
                <a
                  target="_blank"
                  href={invite.inviteLink}
                  className="btn btn-yellow rounded-pill px-4"
                  rel="noopener noreferrer"
                >
                  {step1ButtonLabel}
                </a>
              ) : (
                <button type="button" className="btn btn-yellow rounded-pill px-4" disabled>
                  {step1ButtonLabel}
                </button>
              )}
            </div>

            <div className="cb-custom-event-profile d-flex justify-content-between align-items-center my-3">
              <span className="text-white">{step2Label}</span>
              <button
                type="button"
                className="btn btn-yellow rounded-pill px-4"
                onClick={onStart}
                disabled={!isAccepted}
              >
                {step2ButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvitationPanel;
