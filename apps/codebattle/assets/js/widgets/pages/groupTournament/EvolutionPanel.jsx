import React, { useState } from "react";
import i18n from "../../../i18n";
import RunItem from './RunItem';

const getExternalUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    const externalUrl = new URL(`${url.replace(/\/$/, "")}/browse/README.md`);

    externalUrl.searchParams.set("rev", "main");
    externalUrl.searchParams.set(
      "chatMessage",
      "Это ИИ-ассистент, который поможет тебе решить задачу.",
    );

    return externalUrl.toString();
  } catch (error) {
    console.error("group_tournament: invalid repo url", url, error);
    return null;
  }
};

function EvolutionPanel({
  items,
  tournamentStatus,
  runId,
  setRunId,
  repoUrl,
  onAddSolution,
  leaderboard,
  currentUserId = 1,
}) {
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const externalUrl = tournamentStatus !== "finished" ? getExternalUrl(repoUrl) : null;
  const canAddSolutionInternal = tournamentStatus !== "finished" && !externalUrl && !!onAddSolution;

  return (
    <>
      <div className="cb-evolution-panel-header d-flex align-items-center justify-content-center w-100">
        <h5 className="mb-0 text-white font-weight-bold">{i18n.t("Execution History")}</h5>
      </div>
      <div className="cb-evolution-panel-main mt-3 p-3 w-100">
        <div className="cb-evolution-panel-inner">
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d-block text-decoration-none mb-3"
            >
              <div className="cb-evolution-panel-add-solution btn btn-yellow rounded-pill w-100 text-center">
                {i18n.t("Add Solution +")}
              </div>
            </a>
          )}
          {canAddSolutionInternal && (
            <button
              type="button"
              onClick={onAddSolution}
              className="cb-evolution-panel-add-solution btn btn-yellow rounded-pill w-100 text-center mb-3"
            >
              {i18n.t("Add Solution +")}
            </button>
          )}
          {items && items.length > 0 && (
            <div className="mt-2 small d-flex flex-column cb-timeline">
              {items.map((item) => (
                <RunItem
                  key={item.id}
                  item={item}
                  items={items}
                  setHoverTooltip={setHoverTooltip}
                  runId={runId}
                  setRunId={setRunId}
                  leaderboard={leaderboard}
                  currentUserId={currentUserId}
                />
              ))}
            </div>)}
        </div>
      </div>
      {hoverTooltip && (
        <div
          className="cb-run-item__tooltip"
          style={{ top: hoverTooltip.top, left: hoverTooltip.left }}
        >
          {hoverTooltip.text}
        </div>
      )}
    </>
  );
}

export default EvolutionPanel;
