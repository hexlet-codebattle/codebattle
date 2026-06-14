const useMainPanel = ({
  status,
  run,
  leaderboard,
  roundsCount,
  taskDescription,
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
}) => {
  const initialTab = () => {
    if (status === "finished") return "leaderboard";
    if (status === "active" && run) return "run";
    return "description";
  };

  const isWaiting = status === "waiting_participants";
  const allowedInWaiting = new Set(["description", "task_description"]);
  const requestedTab = activeTabProp ?? initialTab();
  const activeTab = isWaiting && !allowedInWaiting.has(requestedTab) ? "description" : requestedTab;
  const setActiveTab = setActiveTabProp ?? (() => {});

  const isPendingRun = run?.status === "pending";
  const hasViewer = !!run?.result?.viewerHtml;
  const isLoadingResult = run && !isPendingRun && !hasViewer && !run?.detailsLoaded;

  const hasLeaderboard =
    Array.isArray(leaderboard) && leaderboard.length > 0 && Number.isInteger(roundsCount);
  const hasTaskDescription = typeof taskDescription === "string" && taskDescription.length > 0;

  return {
    activeTab,
    setActiveTab,
    isPendingRun,
    hasViewer,
    isLoadingResult,
    hasLeaderboard,
    hasTaskDescription,
  };
};

export default useMainPanel;
