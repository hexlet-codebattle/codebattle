import React, { useState } from "react";
import Markdown from "react-markdown";
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
      <>
        <div
          className="cb-custom-event-profile d-flex align-items-center justify-content-between flex-wrap w-100"
          style={{ minHeight: "64px" }}
        >
          <h5 className="mb-0 text-white font-weight-bold">{i18n.t("Run Viewer")}</h5>
          <div className="d-flex align-items-center">
            {hasHistory && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success rounded-pill px-3 mr-2"
                onClick={() => setOpenJson("history")}
              >
                {i18n.t("history.json")}
              </button>
            )}
            {hasSummary && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success rounded-pill px-3 mr-3"
                onClick={() => setOpenJson("summary")}
              >
                {i18n.t("summary.json")}
              </button>
            )}
            {run?.result?.viewerHtml ? (
              <span
                role="button"
                tabIndex={0}
                className="text-white"
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setViewerFullscreen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setViewerFullscreen(true);
                }}
              >
                {i18n.t("Fullscreen")}
              </span>
            ) : null}
          </div>
        </div>
        <div
          className="mt-3 p-3 w-100"
          style={{ height: "80vh", backgroundColor: "#30333f", borderRadius: "25px" }}
        >
          {run?.result?.viewerHtml ? (
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
          ) : isStubRun ? (
            <div className="text-white p-2">{i18n.t("Click the run to load details.")}</div>
          ) : (
            <div className="text-white p-2">{i18n.t("No viewer HTML for this run.")}</div>
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
      </>
    );
  }

  return (
    <>
      <div
        className="cb-custom-event-profile d-flex align-items-center w-100"
        style={{ minHeight: "64px" }}
      >
        <h5 className="mb-0 text-white font-weight-bold">{i18n.t("Tournament Overview")}</h5>
      </div>
      <div
        className="mt-3 p-3 w-100 overflow-auto"
        style={{
          minHeight: "240px",
          maxHeight: "70vh",
          backgroundColor: "#30333f",
          borderRadius: "25px",
        }}
      >
        {description ? (
          <div className="cb-markdown text-white mb-0">
            <Markdown>{description}</Markdown>
          </div>
        ) : (
          <div className="small text-white-50">
            {i18n.t("No additional setup is required for this tournament.")}
          </div>
        )}
      </div>
    </>
  );
}

export default MainPanel;
