import React from "react";

import i18n from "../../../i18n";

function ExternalPlatformErrorPanel({ requestInviteUpdates }) {
  return (
    <div className="container-fluid h-100">
      <div className="row justify-content-center h-100">
        <div className="col-lg-5 col-md-6 col-sm-8 px-md-4 align-content-center">
          <div className="cb-bg-panel shadow-sm cb-rounded p-5">
            <div className="text-center text-danger mb-3">
              {i18n.t(
                "Could not retrieve your external platform credentials. Please contact support.",
              )}
            </div>
            <div className="d-flex justify-content-center">
              <button
                type="button"
                className="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                onClick={requestInviteUpdates}
              >
                {i18n.t("Retry")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExternalPlatformErrorPanel;
