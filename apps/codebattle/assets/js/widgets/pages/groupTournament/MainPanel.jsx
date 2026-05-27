import React from "react";
import i18n from "../../../i18n";
import JsonViewerModal from "./JsonViewerModal";
import Leaderboard from "./Leaderboard";
import MainPanelTabs from "./MainPanelTabs";
import MainPanelDescription from "./MainPanelDescription";
import MainPanelSettings from "./MainPanelSettings";
import MainPanelRunViewer from "./MainPanelRunViewer";
import MainPanelRunActions from "./MainPanelRunActions";
import useMainPanel from "../../utils/useMainPanel";

function MainPanel({
  run,
  description,
  taskDescription,
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
  const {
    openJson,
    setOpenJson,
    activeTab,
    setActiveTab,
    isPendingRun,
    hasViewer,
    isLoadingResult,
    history,
    summary,
    hasHistory,
    hasSummary,
    hasLeaderboard,
    hasTaskDescription,
  } = useMainPanel({
    status,
    run,
    leaderboard,
    roundsCount,
    taskDescription,
    activeTab: activeTabProp,
    setActiveTab: setActiveTabProp,
  });

  return (
    <>
      <div
        className="cb-custom-event-profile d-flex align-items-center justify-content-between flex-wrap w-100 py-1"
        style={{ minHeight: "64px" }}
      >
        <MainPanelTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hasLeaderboard={hasLeaderboard}
          hasTaskDescription={hasTaskDescription}
          isWaiting={status === "waiting_participants"}
          isAdmin={isAdmin}
          externalSetup={externalSetup}
        />
        <MainPanelRunActions
          activeTab={activeTab}
          run={run}
          hasHistory={hasHistory}
          hasSummary={hasSummary}
          hasViewer={hasViewer}
          setOpenJson={setOpenJson}
          setViewerFullscreen={setViewerFullscreen}
        />
      </div>
      {activeTab === "leaderboard" && hasLeaderboard ? (
        <Leaderboard
          leaderboard={leaderboard}
          roundsCount={roundsCount}
          currentRoundPosition={currentRoundPosition}
          isFinished={status === "finished"}
          currentUserId={currentUserId}
        />
      ) : activeTab === "settings" && isAdmin && externalSetup ? (
        <MainPanelSettings externalSetup={externalSetup} />
      ) : activeTab === "run" ? (
        <MainPanelRunViewer
          run={run}
          hasViewer={hasViewer}
          isPendingRun={isPendingRun}
          isLoadingResult={isLoadingResult}
        />
      ) : activeTab === "task_description" && hasTaskDescription ? (
        <MainPanelDescription description={taskDescription} />
      ) : (
        <MainPanelDescription description={description} />
      )}
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
