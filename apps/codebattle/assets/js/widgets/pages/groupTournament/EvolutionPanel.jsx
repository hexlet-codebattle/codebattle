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

const isSuccess = (item) => item?.status === "success";

const buildRunMeta = (item) => {
  if (!item || typeof item !== "object") {
    return item ? String(item) : null;
  }

  return [i18n.t("Score %{score}", { score: item.score ?? 0 }), formatInsertedAt(item.insertedAt)]
    .filter(Boolean)
    .join(" · ");
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
                const isActive = runId === item?.id;
                const success = isSuccess(item);
                const borderColor = success ? "rgba(40, 167, 69, 0.95)" : "rgba(220, 53, 69, 0.95)";
                const meta = buildRunMeta(item);
                const title = `v${items.length - idx}`;

                return (
                  <button
                    key={item?.id ?? idx}
                    type="button"
                    onClick={() => setRunId(item?.id)}
                    className="rounded p-2 text-left bg-transparent mb-2"
                    style={{
                      border: "1px solid rgba(99, 102, 121, 0.95)",
                      borderLeft: `3px solid ${borderColor}`,
                      backgroundColor: isActive ? "rgba(148, 163, 184, 0.15)" : "transparent",
                      transition: "background-color 160ms ease",
                      width: "100%",
                    }}
                    onMouseEnter={(event) => {
                      if (!isActive) {
                        event.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isActive) {
                        event.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <div className="d-flex align-items-center text-nowrap">
                      <span className="badge badge-secondary mr-2">{title}</span>
                      <span className={`text-truncate ${isActive ? "text-white" : "text-muted"}`}>
                        {meta}
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
