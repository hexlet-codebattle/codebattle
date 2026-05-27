import React from "react";
import i18n from "../../../i18n";

const MainPanelRunViewer = ({ run, hasViewer, isPendingRun, isLoadingResult }) => (
  <div className="mt-3 p-3 w-100 cb-group-tournament-leaderboard-container">
    {!run ? (
      <div className="text-white-50 p-2">
        {i18n.t("Pick a run from the left panel to see its output.")}
      </div>
    ) : hasViewer ? (
      <iframe
        title={`run-viewer-${run.id}`}
        srcDoc={run.result.viewerHtml}
        sandbox="allow-scripts"
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          backgroundColor: "#1a1d2b",
          borderRadius: "16px",
        }}
      />
    ) : isPendingRun ? (
      <div className="d-flex align-items-center justify-content-center h-100 text-white">
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" role="status" aria-hidden="true" />
          <div className="h5 mb-1">{i18n.t("Running your solution…")}</div>
          <div className="small text-white-50">
            {i18n.t("We're executing your code in the runner. This may take a few seconds.")}
          </div>
        </div>
      </div>
    ) : isLoadingResult ? (
      <div className="d-flex align-items-center justify-content-center h-100 text-white">
        <div className="text-center">
          <div className="spinner-border text-info mb-3" role="status" aria-hidden="true" />
          <div className="h5 mb-1">{i18n.t("Loading run result…")}</div>
          <div className="small text-white-50">{i18n.t("Fetching the executed run output.")}</div>
        </div>
      </div>
    ) : (
      <div className="text-white p-2">{i18n.t("No viewer HTML for this run.")}</div>
    )}
  </div>
);

export default MainPanelRunViewer;
