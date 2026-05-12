import React, { useState } from "react";
import dayjs from "../../../i18n/dayjs";
import i18n from "../../../i18n";

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

const formatInsertedAtTooltip = (insertedAt) => {
  if (!insertedAt) {
    return undefined;
  }

  const date = dayjs.utc(insertedAt).tz(dayjs.tz.guess());

  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : undefined;
};

const isSuccess = (item) => item?.status === "success";

const findBestRunId = (items) => {
  if (!items || items.length === 0) {
    return null;
  }

  let bestId = null;
  let bestScore = -Infinity;

  items.forEach((item) => {
    const score = item?.score ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestId = item?.id;
    }
  });

  return bestId;
};

function EvolutionPanel({ items, tournamentStatus, runId, setRunId, repoUrl }) {
  const bestRunId = findBestRunId(items);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const externalUrl = tournamentStatus !== "finished" ? getExternalUrl(repoUrl) : null;

  return (
    <>
      <div
        className="cb-custom-event-profile d-flex align-items-center justify-content-center w-100"
        style={{ minHeight: "64px" }}
      >
        <h5 className="mb-0 text-white font-weight-bold">{i18n.t("Execution History")}</h5>
      </div>
      <div
        className="mt-3 p-3 w-100"
        style={{
          height: "80vh",
          overflowY: "auto",
          backgroundColor: "#30333f",
          borderRadius: "25px",
        }}
      >
        <div
          style={{
            paddingRight: "4px",
            overflowX: "hidden",
            scrollbarGutter: "stable",
          }}
        >
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d-block text-decoration-none mb-3"
            >
              <div
                className="btn btn-yellow rounded-pill w-100 text-center text-nowrap"
                style={{ padding: "12px 12px" }}
              >
                {i18n.t("Add Solution +")}
              </div>
            </a>
          )}
          {items && items.length > 0 && (
            <div className="mt-2 small d-flex flex-column">
              {items.map((item, idx) => {
                const isActive = runId === item?.id;
                const success = isSuccess(item);
                const isBest = item?.id != null && item.id === bestRunId;
                const statusColor = success ? "rgba(40, 167, 69, 0.95)" : "rgba(220, 53, 69, 0.95)";
                const ringColor = isActive
                  ? "rgba(96, 165, 250, 0.95)"
                  : "rgba(99, 102, 121, 0.95)";
                const title = `v${items.length - idx}`;
                const score = item?.score ?? 0;
                const tooltip = formatInsertedAtTooltip(item?.insertedAt);

                return (
                  <div key={item?.id ?? idx} className="mb-2">
                    <button
                      type="button"
                      onClick={() => setRunId(item?.id)}
                      className="rounded-pill p-2 px-3 text-left bg-transparent"
                      style={{
                        borderTop: `1px solid ${ringColor}`,
                        borderRight: `1px solid ${ringColor}`,
                        borderBottom: `1px solid ${ringColor}`,
                        borderLeft: `3px solid ${statusColor}`,
                        backgroundColor: isActive ? "rgba(96, 165, 250, 0.25)" : "transparent",
                        boxShadow: isActive ? "0 0 0 1px rgba(96, 165, 250, 0.5)" : "none",
                        transition: "background-color 160ms ease, box-shadow 160ms ease",
                        width: "100%",
                      }}
                      onMouseEnter={(event) => {
                        if (!isActive) {
                          event.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
                        }
                        if (tooltip) {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setHoverTooltip({
                            text: tooltip,
                            top: rect.top + rect.height / 2,
                            left: rect.right + 8,
                          });
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!isActive) {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }
                        setHoverTooltip(null);
                      }}
                    >
                      <div className="d-flex align-items-center text-nowrap">
                        <span className="badge badge-secondary mr-2">{title}</span>
                        <span
                          className="font-weight-bold mr-2"
                          style={{
                            fontSize: "1.15rem",
                            color: isActive ? "#ffffff" : "#e2e8f0",
                          }}
                        >
                          {i18n.t("Score %{score}", { score })}
                        </span>
                        {isBest && (
                          <span
                            className={`small text-truncate ${isActive ? "text-white-50" : "text-muted"}`}
                          >
                            {i18n.t("best try")}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {hoverTooltip && (
        <div
          className="cb-run-item-tooltip"
          style={{ top: hoverTooltip.top, left: hoverTooltip.left }}
        >
          {hoverTooltip.text}
        </div>
      )}
    </>
  );
}

export default EvolutionPanel;
