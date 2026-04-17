import React from "react";

function MainPanel({ status, run, externalSetup, description }) {
  return (
    <div className="card cb-card cb-border-color border rounded h-100">
      <div className="card-header py-2">
        <h6 className="cb-text mb-0">Tournament Overview</h6>
      </div>
      <div className="card-body p-3 border-top cb-border-color overflow-auto">
        {description && !run && (
          <div className="mb-3">
            <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
              {description}
            </p>
          </div>
        )}
        {run ? (
          <div className="small">
            <div className="mb-1">
              <strong>External setup:</strong> {externalSetup.state}
            </div>
            <div className="mb-1">
              <strong>Repo:</strong> {externalSetup.repoState}
            </div>
            <div className="mb-1">
              <strong>Role:</strong> {externalSetup.roleState}
            </div>
            <div className="mb-1">
              <strong>Secret:</strong> {externalSetup.secretState}
            </div>
            <div className="mb-1">
              <strong>Repo slug:</strong> {externalSetup.repoSlug || "n/a"}
            </div>
            <div className="mb-1">
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
          !description && (
            <div className="small text-muted">
              No additional setup is required for this tournament.
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default MainPanel;
