import React, { useState } from "react";
import i18n from "../../../i18n";
import JsonViewerModal from "./JsonViewerModal";

function MainPanel({ run, description, setViewerFullscreen }) {
  const [openJson, setOpenJson] = useState(null); // "history" | "summary" | null

  const isStubRun =
    run?.groupTournamentId && !run?.detailsLoaded && !run?.solution && !run?.result?.viewerHtml;

  const history = run?.result?.history;
  const summary = run?.result?.summary;
  const hasHistory = history != null;
  const hasSummary = summary != null;

  if (run) {
    return (
      <div className="card cb-card border cb-border-color rounded shadow-sm d-flex flex-column">
        <div className="card-header py-2 border-bottom cb-border-color">
          <h6 className="cb-text mb-0 d-flex align-items-center justify-content-between">
            <span>{i18n.t("Run Viewer")}</span>
            <span className="d-flex align-items-center">
              {hasHistory && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success mr-2"
                  onClick={() => setOpenJson("history")}
                >
                  {i18n.t("history.json")}
                </button>
              )}
              {hasSummary && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success mr-3"
                  onClick={() => setOpenJson("summary")}
                >
                  {i18n.t("summary.json")}
                </button>
              )}
              {run?.result?.viewerHtml ? (
                <span
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setViewerFullscreen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setViewerFullscreen(true);
                  }}
                >
                  {i18n.t("Fullscreen")}
                </span>
              ) : null}
            </span>
          </h6>
        </div>
        <div className="card-body p-2 border-top cb-border-color" style={{ height: "80vh" }}>
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
          ) : isStubRun ? (
            <div className="cb-text p-2">{i18n.t("Click the run to load details.")}</div>
          ) : (
            <div className="cb-text p-2">{i18n.t("No viewer HTML for this run.")}</div>
          )}
        </div>
        <JsonViewerModal
          open={openJson === "history"}
          title={i18n.t("history.json")}
          value={history}
          onClose={() => setOpenJson(null)}
        />
        <JsonViewerModal
          open={openJson === "summary"}
          title={i18n.t("summary.json")}
          value={summary}
          onClose={() => setOpenJson(null)}
        />
      </div>
    );
  }

  return (
    <div className="card cb-card border cb-border-color rounded shadow-sm">
      <div className="card-header py-2 border-bottom cb-border-color">
        <h6 className="cb-text mb-0">{i18n.t("Tournament Overview")}</h6>
      </div>
      <div
        className="card-body p-3 border-top cb-border-color overflow-auto"
        style={{ minHeight: "240px", maxHeight: "70vh" }}
      >
        {description ? (
          <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {description}
          </p>
        ) : (
          <div className="small text-muted">
            {i18n.t("No additional setup is required for this tournament.")}
          </div>
        )}
      </div>
    </div>
  );
}

export default MainPanel;
