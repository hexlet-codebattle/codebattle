import React, { useState } from "react";
import i18n from "../../../i18n";

function AdminExternalSetupPanel({ externalSetup }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="cb-bg-panel shadow-sm cb-rounded p-3 w-100">
      <button
        type="button"
        className="btn btn-link d-flex align-items-center justify-content-between w-100 p-0 text-decoration-none"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <h6 className="mb-0">
          {i18n.t("External Setup")}
          <span
            className={`badge ms-2 ${externalSetup.state === "ready" ? "badge-success" : "badge-warning"}`}
          >
            {externalSetup.state}
          </span>
        </h6>
        <span className="small text-muted">{collapsed ? i18n.t("Show") : i18n.t("Hide")}</span>
      </button>
      {!collapsed && (
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
      )}
    </div>
  );
}

export default AdminExternalSetupPanel;
