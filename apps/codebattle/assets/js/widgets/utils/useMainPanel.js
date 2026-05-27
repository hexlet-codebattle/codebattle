import { useState } from "react";

const useMainPanel = ({
  status,
  run,
  leaderboard,
  roundsCount,
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
}) => {
  const [openJson, setOpenJson] = useState(null); // "history" | "summary" | null

  const initialTab = () => {
    if (status === "finished") return "leaderboard";
    if (status === "active") return "run";
    return "description";
  };

  const activeTab = activeTabProp ?? initialTab();
  const setActiveTab = setActiveTabProp ?? (() => { });

  const isPendingRun = run?.status === "pending";
  const hasViewer = !!run?.result?.viewerHtml;
  const isLoadingResult = run && !isPendingRun && !hasViewer && !run?.detailsLoaded;

  const history = run?.result?.history;
  const summary = run?.result?.summary;
  const hasHistory = history != null;
  const hasSummary = summary != null;
  const hasLeaderboard =
    Array.isArray(leaderboard) && leaderboard.length > 0 && Number.isInteger(roundsCount);

  return {
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
  };
};

export default useMainPanel;
