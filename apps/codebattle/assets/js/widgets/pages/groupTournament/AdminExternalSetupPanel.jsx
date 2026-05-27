import React from "react";

function AdminExternalSetupPanel({ externalSetup }) {
  return (
    <div className="cb-rounded p-3 w-100">
      <div className="small mt-2">
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
        {externalSetup.lastError && Object.keys(externalSetup.lastError).length > 0 && (
          <pre className="mt-2 mb-0 text-danger" style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(externalSetup.lastError, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default AdminExternalSetupPanel;
