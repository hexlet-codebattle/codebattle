import React from "react";

function FullscreenGroupBattleViewer({ viewerFullscreen, selectedRun, setViewerFullscreen }) {
  if (!(viewerFullscreen && selectedRun?.result?.viewerHtml)) {
    return <></>;
  }

  return (
    <div
      className="position-fixed d-flex flex-column"
      style={{
        inset: 0,
        zIndex: 2000,
        backgroundColor: "rgba(15, 23, 42, 0.96)",
        padding: "16px",
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-white">
          {i18n.t("Run Viewer Fullscreen")}
          {selectedRun ? ` • Run #${selectedRun.id}` : ""}
        </div>
        <button
          type="button"
          className="btn btn-outline-light cb-rounded"
          onClick={() => setViewerFullscreen(false)}
        >
          {i18n.t("Close Fullscreen")}
        </button>
      </div>
      <div className="flex-grow-1">
        <iframe
          title={`run-viewer-fullscreen-${selectedRun.id}`}
          srcDoc={selectedRun.result.viewerHtml}
          sandbox="allow-scripts"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            backgroundColor: "#fff",
            borderRadius: "8px",
          }}
        />
      </div>
    </div>
  );
}

export default FullscreenGroupBattleViewer;
