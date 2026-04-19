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

  return date.toLocaleString();
};

const buildRunSummary = (item, idx) => {
  if (!item || typeof item !== "object") {
    return {
      key: idx,
      title: `v${idx + 1}`,
      meta: item ? String(item) : null,
    };
  }

  const playersCount = item.playerIds?.length;
  const meta = [
    item.status,
    playersCount ? i18n.t("%{count} players", { count: playersCount }) : null,
    formatInsertedAt(item.insertedAt),
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    key: item.id ?? idx,
    title: `Run #${item.id ?? idx + 1}`,
    meta,
  };
};

function EvolutionPanel({ items, tournamentStatus, runId, setRunId, repoUrl }) {
  return (
    <div className="card cb-card border cb-border-color rounded h-100">
      <div className="card-header py-2">
        <h6 className="cb-text mb-0">{i18n.t("Execution History")}</h6>
      </div>
      <div className="card-body p-1 border-top cb-border-color">
        <div className="cb-overflow-y-auto">
          {tournamentStatus !== "finished" && repoUrl && (
            <a href={getExternalUrl(repoUrl)} target="_blank" rel="noopener noreferrer">
              <div className="border cb-border-color rounded p-3">{i18n.t("+ Add Solution")}</div>
            </a>
          )}
          {items && items.length > 0 && (
            <div className="mt-2 small">
              <div className="list-group list-group-flush">
                {items.map((item, idx) => {
                  const summary = buildRunSummary(item, idx);

                  return (
                    <button
                      key={summary.key}
                      type="button"
                      onClick={() => setRunId(item?.id)}
                      className="list-group-item list-group-item-action px-0 py-1 border-0 text-left bg-transparent"
                      style={{
                        backgroundColor:
                          runId === item?.id ? "rgba(40, 167, 69, 0.14)" : "transparent",
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <span className="badge badge-secondary mr-2">v{idx + 1}</span>
                        <span className="text-truncate">{summary.title}</span>
                      </div>
                      {summary.meta ? (
                        <small className="d-block text-muted text-truncate mt-1">
                          {summary.meta}
                        </small>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvolutionPanel;
