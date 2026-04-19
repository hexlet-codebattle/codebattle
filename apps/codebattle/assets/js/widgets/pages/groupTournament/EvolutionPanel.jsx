import React from "react";
import i18n from "../../../i18n";

const getExternalUrl = (url) => `${url}/browse/README.md?rev=main&chatMessage=""`;

const formatInsertedAt = (insertedAt) => {
  if (!insertedAt) {
    return null;
  }

  const date = new Date(insertedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const buildRunSummary = (item, idx, totalItems) => {
  if (!item || typeof item !== "object") {
    return {
      key: idx,
      title: `v${idx + 1}`,
      meta: item ? String(item) : null,
    };
  }

  const meta = [
    item.status,
    item.score != null ? i18n.t("Score %{score}", { score: item.score }) : null,
    formatInsertedAt(item.insertedAt),
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    key: item.id ?? idx,
    title: `v${totalItems - idx}`,
    meta,
  };
};

function EvolutionPanel({ items, tournamentStatus, runId, setRunId, repoUrl }) {
  return (
    <div className="card cb-card border cb-border-color rounded h-100 shadow-sm">
      <div className="card-header py-3 border-bottom cb-border-color">
        <h6 className="cb-text mb-0">{i18n.t("Execution History")}</h6>
      </div>
      <div className="card-body p-2 border-top cb-border-color">
        <div
          className="cb-overflow-y-auto"
          style={{
            paddingRight: "4px",
            overflowX: "hidden",
            scrollbarGutter: "stable",
          }}
        >
          {tournamentStatus !== "finished" && repoUrl && (
            <a href={getExternalUrl(repoUrl)} target="_blank" rel="noopener noreferrer">
              <div className="border cb-border-color rounded p-3 mb-2 bg-transparent">
                {i18n.t("+ Add Solution")}
              </div>
            </a>
          )}
          {items && items.length > 0 && (
            <div className="mt-2 small d-flex flex-column">
              {items.map((item, idx) => {
                const summary = buildRunSummary(item, idx, items.length);
                const isActive = runId === item?.id;

                return (
                  <button
                    key={summary.key}
                    type="button"
                    onClick={() => setRunId(item?.id)}
                    className="border cb-border-color rounded p-3 text-left bg-transparent mb-2"
                    style={{
                      backgroundColor: isActive ? "rgba(40, 167, 69, 0.2)" : "transparent",
                      borderColor: isActive ? "rgba(40, 167, 69, 0.7)" : "rgba(99, 102, 121, 0.95)",
                      boxShadow: isActive ? "inset 3px 0 0 rgba(40, 167, 69, 0.95)" : "none",
                      transition:
                        "background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                      width: "100%",
                    }}
                    onMouseEnter={(event) => {
                      if (!isActive) {
                        event.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
                        event.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.75)";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isActive) {
                        event.currentTarget.style.backgroundColor = "transparent";
                        event.currentTarget.style.borderColor = "rgba(99, 102, 121, 0.95)";
                      }
                    }}
                  >
                    <div className="d-flex align-items-center text-nowrap">
                      <span className="badge badge-secondary mr-2">{summary.title}</span>
                      <span className={`text-truncate ${isActive ? "text-white" : "text-muted"}`}>
                        {summary.meta}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvolutionPanel;
