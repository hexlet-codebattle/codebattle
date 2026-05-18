import React, { useState } from "react";
import Markdown from "react-markdown";
import i18n from "../../../i18n";
import JsonViewerModal from "./JsonViewerModal";
import Leaderboard from "./Leaderboard";

function MainPanel({
  run,
  description,
  setViewerFullscreen,
  leaderboard,
  roundsCount,
  currentRoundPosition,
  status,
}) {
  const [openJson, setOpenJson] = useState(null); // "history" | "summary" | null
  const [activeTab, setActiveTab] = useState("run"); // "run" | "leaderboard"

  const isStubRun =
    run?.groupTournamentId && !run?.detailsLoaded && !run?.solution && !run?.result?.viewerHtml;

  const history = run?.result?.history;
  const summary = run?.result?.summary;
  const hasHistory = history != null;
  const hasSummary = summary != null;
  const hasLeaderboard =
    Array.isArray(leaderboard) &&
    leaderboard.length > 0 &&
    Number.isInteger(roundsCount) &&
    roundsCount > 1;

  const tabBtnClass = (active) =>
    `btn btn-sm px-3 mr-2 text-white shadow-none border-0 rounded-0 ${
      active ? "font-weight-bold" : ""
    }`;
  const tabBtnStyle = (active) => ({
    borderBottom: active ? "2px solid #fff" : "2px solid transparent",
    background: "transparent",
  });

  const renderTabs = () => (
    <div className="d-flex align-items-center mr-3">
      <button
        type="button"
        className={tabBtnClass(activeTab === "run")}
        style={tabBtnStyle(activeTab === "run")}
        onClick={() => setActiveTab("run")}
      >
        {i18n.t("Run Viewer")}
      </button>
      {hasLeaderboard && (
        <button
          type="button"
          className={tabBtnClass(activeTab === "leaderboard")}
          style={tabBtnStyle(activeTab === "leaderboard")}
          onClick={() => setActiveTab("leaderboard")}
        >
          {i18n.t("Leaderboard")}
        </button>
      )}
    </div>
  );

  if (activeTab === "leaderboard" && hasLeaderboard) {
    return (
      <>
        <div
          className="cb-custom-event-profile d-flex align-items-center justify-content-between flex-wrap w-100"
          style={{ minHeight: "64px" }}
        >
          {renderTabs()}
        </div>
        <div
          className="mt-3 p-3 w-100 overflow-auto"
          style={{
            minHeight: "240px",
            maxHeight: "80vh",
            backgroundColor: "#30333f",
            borderRadius: "25px",
          }}
        >
          <Leaderboard
            leaderboard={leaderboard}
            roundsCount={roundsCount}
            currentRoundPosition={currentRoundPosition}
            isFinished={status === "finished"}
          />
        </div>
      </>
    );
  }

  if (run) {
    return (
      <>
        <div
          className="cb-custom-event-profile d-flex align-items-center justify-content-between flex-wrap w-100"
          style={{ minHeight: "64px" }}
        >
          {renderTabs()}
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
                className="text-white mr-3"
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
        {renderTabs()}
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
