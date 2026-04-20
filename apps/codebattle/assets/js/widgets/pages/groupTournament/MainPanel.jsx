import React from "react";
import i18n from "../../../i18n";

function MainPanel({ run, description, setViewerFullscreen }) {
  const isStubRun =
    run?.groupTournamentId && !run?.detailsLoaded && !run?.solution && !run?.result?.viewerHtml;

  if (run) {
    return (
      <>
        <div className="card cb-card border cb-border-color rounded h-100 shadow-sm">
          <div className="card-header py-3 border-bottom cb-border-color">
            <h6 className="cb-text mb-0">
              {i18n.t("Run Viewer")}
              {run?.result?.viewerHtml ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="float-right"
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setViewerFullscreen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setViewerFullscreen(true);
                  }}
                >
                  {i18n.t("Fullscreen")}
                </span>
              ) : null}
            </h6>
          </div>
          <div className="card-body p-2 border-top cb-border-color">
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
        </div>
      </>
    );
  }

  return (
    <div className="card cb-card border cb-border-color rounded h-100 shadow-sm">
      <div className="card-header py-3 border-bottom cb-border-color">
        <h6 className="cb-text mb-0">{i18n.t("Tournament Overview")}</h6>
      </div>
      <div className="card-body p-2 border-top cb-border-color overflow-auto">
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
