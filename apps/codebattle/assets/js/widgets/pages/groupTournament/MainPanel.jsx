import React from "react";
import i18n from "../../../i18n";

function MainPanel({ run, description, setViewerFullscreen }) {
  if (run) {
    return (
      <>
        <div className="cb-bg-panel shadow-sm cb-rounded p-4 mb-3" style={{ height: "82vh" }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="text-white" style={{ fontSize: "1.6rem", lineHeight: 1.2 }}>
              {i18n.t("Run Viewer")}
              {run ? ` • Run #${run.id}` : ""}
            </div>
            {run?.result?.viewerHtml ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                onClick={() => setViewerFullscreen(true)}
              >
                {i18n.t("Fullscreen")}
              </button>
            ) : null}
          </div>
          {run?.result?.viewerHtml ? (
            <iframe
              title={`run-viewer-${run.id}`}
              srcDoc={run.result.viewerHtml}
              sandbox="allow-scripts"
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                backgroundColor: "#fff",
                borderRadius: "8px",
              }}
            />
          ) : (
            <div className="cb-text">{i18n.t("No viewer HTML for this run.")}</div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="card cb-card cb-border-color border rounded h-100">
      <div className="card-header py-2">
        <h6 className="cb-text mb-0">{i18n.t("Tournament Overview")}</h6>
      </div>
      <div className="card-body p-3 border-top cb-border-color overflow-auto">
        {description && (
          <div className="mb-3">
            <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
              {description}
            </p>
          </div>
        )}
        {!description && (
          <div className="small text-muted">
            {i18n.t("No additional setup is required for this tournament.")}
          </div>
        )}
      </div>
    </div>
  );
}

export default MainPanel;
