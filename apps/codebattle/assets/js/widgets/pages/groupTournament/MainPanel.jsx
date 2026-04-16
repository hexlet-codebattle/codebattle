import React from "react";

function MainPanel({ status, externalSetup }) {
  return (
    <div className="card border rounded">
      <div className="card-header py-2">
        <h6 className="mb-0">Tournament Overview</h6>
        <small className="text-muted">Current status and controls</small>
      </div>
      <div className="card-body p-3 border-top max-vh-50 overflow-auto">
        <p className="text-muted mb-3">Main content area for tournament information and actions.</p>
        {externalSetup ? (
          <div className="small">
            <div>
              <strong>External setup:</strong> {externalSetup.state}
            </div>
            <div>
              <strong>Repo:</strong> {externalSetup.repoState}
            </div>
            <div>
              <strong>Role:</strong> {externalSetup.roleState}
            </div>
            <div>
              <strong>Secret:</strong> {externalSetup.secretState}
            </div>
            <div>
              <strong>Repo slug:</strong> {externalSetup.repoSlug || "n/a"}
            </div>
            <div>
              <strong>Repo URL:</strong>{" "}
              {externalSetup.repoUrl ? (
                <a href={externalSetup.repoUrl} target="_blank" rel="noreferrer">
                  {externalSetup.repoUrl}
                </a>
              ) : (
                "n/a"
              )}
            </div>
            {externalSetup.lastError && Object.keys(externalSetup.lastError).length > 0 ? (
              <pre className="mt-2 mb-0 text-danger" style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(externalSetup.lastError, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : (
          <div className="text-muted small">
            External setup is not required for this tournament.
          </div>
        )}
      </div>
    </div>
  );
}

export default MainPanel;
