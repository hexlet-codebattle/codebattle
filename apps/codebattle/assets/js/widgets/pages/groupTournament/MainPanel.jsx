import React, { useState } from "react";
import Markdown from "react-markdown";
import i18n from "../../../i18n";
import JsonViewerModal from "./JsonViewerModal";
import Leaderboard from "./Leaderboard";
import AdminExternalSetupPanel from "./AdminExternalSetupPanel";

function MainPanel({
  run,
  description,
  setViewerFullscreen,
  leaderboard,
  roundsCount,
  currentRoundPosition,
  status,
  currentUserId,
  isAdmin,
  externalSetup,
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
}) {
  const [openJson, setOpenJson] = useState(null); // "history" | "summary" | null
  // Pick the initial tab from the tournament's current state on first mount:
  // finished tournaments open on the leaderboard, active ones open on the
  // run viewer (which auto-selects the newest run), and pre-start ones open
  // on the description. The user can switch freely afterwards — we don't
  // re-derive on later status changes so we don't yank them away mid-read.
  const initialTab = () => {
    if (status === "finished") return "leaderboard";
    if (status === "active") return "run";
    return "description";
  };
  const activeTab = activeTabProp ?? initialTab();
  const setActiveTab = setActiveTabProp ?? (() => { });

  const isPendingRun = run?.status === "pending";
  const hasViewer = !!run?.result?.viewerHtml;
  // The result map (with viewerHtml/history/summary) only arrives via an
  // explicit details fetch. A run can sit between a status broadcast and the
  // follow-up details fetch, or be an older row we never fetched. In both
  // cases show a loading indicator instead of the misleading "no viewer" text.
  const isLoadingResult = run && !isPendingRun && !hasViewer && !run?.detailsLoaded;

  const history = run?.result?.history;
  const summary = run?.result?.summary;
  const hasHistory = history != null;
  const hasSummary = summary != null;
  // Show the leaderboard tab for every multi-player tournament regardless of
  // round count or how far along the tournament is — players want to see
  // current standings even before round 1 is over, and single-round
  // tournaments still benefit from the slice/seed views.
  const hasLeaderboard =
    Array.isArray(leaderboard) && leaderboard.length > 0 && Number.isInteger(roundsCount);

  const tabBtnClass = (active) =>
    `btn btn-sm px-4 py-2 mr-2 shadow-none border-0 rounded-pill cb-tab-btn ${active ? "text-white font-weight-bold cb-tab-btn--active" : "text-white-50"
    }`;
  const tabBtnStyle = (active) => ({
    borderBottom: active ? "3px solid #3182ce" : "3px solid transparent",
    transition: "all 0.2s ease-in-out",
  });

  const renderTabs = () => (
    <div className="d-flex align-items-center mr-3">
      {["description", "run", hasLeaderboard && "leaderboard", isAdmin && externalSetup && "settings"]
        .filter(Boolean)
        .map((tab) => (
          <button
            key={tab}
            type="button"
            className={tabBtnClass(activeTab === tab)}
            style={tabBtnStyle(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "settings" ? (
              <h6 className="mb-0">
                {i18n.t("External Setup")}
                <span
                  className={`badge ms-2 ${externalSetup.state === "ready" ? "badge-success" : "badge-warning"}`}
                >
                  {externalSetup.state}
                </span>
              </h6>
            ) : (
              i18n.t(tab.charAt(0).toUpperCase() + tab.slice(1).replace("run", "Run Viewer"))
            )}
          </button>
        ))}
    </div>
  );

  const renderDescription = () => (
    <div
      className="mt-3 p-3 w-100 overflow-auto"
      style={{
        minHeight: "70vh",
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
          {i18n.t("No description provided for this tournament.")}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div
      className="mt-3 p-3 w-100 overflow-auto"
      style={{
        minHeight: "70vh",
        maxHeight: "70vh",
        backgroundColor: "#30333f",
        borderRadius: "25px",
      }}
    >
      <AdminExternalSetupPanel externalSetup={externalSetup} />
    </div>
  );

  const renderLeaderboard = () => (
    <div
      className="mt-3 p-3 w-100 overflow-auto"
      style={{
        minHeight: "70vh",
        maxHeight: "70vh",
        backgroundColor: "#30333f",
        borderRadius: "25px",
      }}
    >
      <Leaderboard
        leaderboard={leaderboard}
        roundsCount={roundsCount}
        currentRoundPosition={currentRoundPosition}
        isFinished={status === "finished"}
        currentUserId={currentUserId}
      />
    </div>
  );

  const renderRunViewer = () => (
    <div
      className="mt-3 p-3 w-100"
      style={{ height: "70vh", backgroundColor: "#30333f", borderRadius: "25px" }}
    >
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

  const renderRunActions = () =>
    activeTab === "run" &&
    run && (
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
        {hasViewer ? (
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
    );

  return (
    <>
      <div
        className="cb-custom-event-profile d-flex align-items-center justify-content-between flex-wrap w-100 py-1"
        style={{ minHeight: "64px" }}
      >
        {renderTabs()}
        {renderRunActions()}
      </div>
      {activeTab === "leaderboard" && hasLeaderboard
        ? renderLeaderboard()
        : activeTab === "settings" && isAdmin && externalSetup
          ? renderSettings()
          : activeTab === "run"
            ? renderRunViewer()
            : renderDescription()}
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

export default MainPanel;
