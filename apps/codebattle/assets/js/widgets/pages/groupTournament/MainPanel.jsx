import React from "react";

function MainPanel({ status, externalSetup, description }) {
  return (
    <div className="cb-bg-panel shadow-sm cb-rounded">
      <div className="p-3 border-bottom cb-border-color">
        <h6 className="mb-0">Tournament Overview</h6>
      </div>
      <div className="p-3 cb-overflow-y-auto max-vh-50">
        {description && (
          <div className="mb-3">
            <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
              {description}
            </p>
          </div>
        )}
        {externalSetup ? (
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
