import React from "react";

import { useSelector } from "react-redux";

import i18n from "../../../i18n";
import {
  currentUserSelector,
  participantDataSelector,
  eventSelector,
} from "../../selectors";

const ParticipantDashboard = () => {
  const user = useSelector(currentUserSelector);
  const participantData = useSelector(participantDataSelector);
  const event = useSelector(eventSelector);

  if (!participantData || !event) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="display-4 text-white">
              {i18n.t("Participant Dashboard")}
            </h1>
            <div className="text-white">Loading participant data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="display-4 text-white">
            {i18n.t("Participant Dashboard")}
          </h1>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-12">
          <div className="card bg-dark text-white rounded-lg border-0">
            <div className="card-body d-flex justify-content-between align-items-center py-3">
              <div className="user-info d-flex align-items-center">
                <div>
                  <div>
                    {i18n.t("Clan")}{" "}
                    <span className="text-warning ms-2">{user.clan}</span>
                  </div>
                  <div>
                    {i18n.t("Category")}{" "}
                    <span className="text-warning ms-2">{user.category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stages-container">
        {participantData.stages.map((stage) => (
          <div key={stage.slug} className="row mb-2">
            <div className="col-12">
              <div className="card bg-dark text-white rounded-lg border-0">
                <div className="card-body d-flex justify-content-between align-items-center py-3">
                  <div className="stage-info d-flex">
                    <div className="me-3" style={{ minWidth: "200px" }}>
                      <div>{stage.name}</div>
                      {stage.dates && (
                        <div className="text-muted">{stage.dates}</div>
                      )}
                    </div>
                  </div>
                  {stage.isStageAvailableForUser &&
                    stage.type === "tournament" && (
                      <div className="action-button">
                        <button
                          type="button"
                          className="btn btn-warning rounded-pill px-4"
                          data-bs-toggle="modal"
                          data-bs-target={`#confirmModal-${stage.slug}`}
                        >
                          {i18n.t(stage.actionButtonText)}
                        </button>

                        <div
                          className="modal fade"
                          id={`confirmModal-${stage.slug}`}
                          tabIndex="-1"
                          aria-hidden="true"
                        >
                          <div className="modal-dialog">
                            <div className="modal-content">
                              <div className="modal-header">
                                <h5 className="modal-title text-dark">
                                  {i18n.t("Confirm Action")}
                                </h5>
                                <button
                                  type="button"
                                  className="btn-close"
                                  data-bs-dismiss="modal"
                                  aria-label="Close"
                                ></button>
                              </div>
                              <div className="modal-body text-dark">
                                {i18n.t("Are you sure you want to proceed?")}
                              </div>
                              <div className="modal-footer">
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  data-bs-dismiss="modal"
                                >
                                  {i18n.t("Cancel")}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-warning"
                                  data-method="post"
                                  data-csrf={window.csrf_token}
                                  data-to={`/e/${event.slug}/stage?stage_slug=${stage.slug}`}
                                >
                                  {i18n.t("Confirm")}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  {stage.isStageAvailableForUser &&
                    stage.type === "entrance" && (
                      <div className="action-button">
                        <p>Lol</p>
                      </div>
                    )}
                  {stage.type === "tournament" && (
                    <div className="d-flex">
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t("Overall")}: {stage.placeInTotalRank}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t("Category")}: {stage.placeInCategoryRank}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t("Games count")}: {stage.gamesCount}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t("Wins count")}: {stage.winsCount}
                          </span>
                        </div>
                      </div>
                      <div className="standings-info text-center me-5">
                        <div className="d-flex align-items-center">
                          <span>
                            {i18n.t("Time spent")}: {stage.timeSpent}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantDashboard;
