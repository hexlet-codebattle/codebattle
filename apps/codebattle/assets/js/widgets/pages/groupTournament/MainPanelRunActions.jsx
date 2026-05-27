import React from "react";
import i18n from "../../../i18n";

const MainPanelRunActions = ({
  activeTab,
  run,
  hasHistory,
  hasSummary,
  hasViewer,
  setOpenJson,
  setViewerFullscreen,
}) => {
  if (activeTab !== "run" || !run) return null;

  return (
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
};

export default MainPanelRunActions;
