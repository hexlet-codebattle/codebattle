import React, { useEffect, useMemo, useState } from "react";
import MonacoEditor from "@monaco-editor/react";

import { camelizeKeys } from "humps";

import languages from "@/config/languages";

const EMPTY_ARRAY = [];

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.response = { data, status: response.status };
    throw error;
  }

  return camelizeKeys(data);
};

function formatDate(value) {
  if (!value) return "none";

  try {
    return new Date(value).toLocaleString();
  } catch (_error) {
    return value;
  }
}

function formatTime(value) {
  if (!value) return "none";

  try {
    return new Date(value).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (_error) {
    return value;
  }
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return "00:00";

  const normalized = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatJson(value) {
  if (value == null) return "{}";

  try {
    return JSON.stringify(value, null, 2);
  } catch (_error) {
    return "{}";
  }
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function roundProgressColor(progress) {
  const normalized = clamp(progress, 0, 1);
  const red = Math.round(lerp(40, 220, normalized));
  const green = Math.round(lerp(167, 53, normalized));
  const blue = Math.round(lerp(69, 69, normalized));

  return `rgb(${red}, ${green}, ${blue})`;
}

function historyItemStyle(selected) {
  return {
    padding: "0.35rem 0.55rem",
    lineHeight: 1.1,
    backgroundColor: selected ? "rgba(40, 167, 69, 0.22)" : "rgba(255, 255, 255, 0.04)",
    color: selected ? "#f8fafc" : "#cbd5e1",
    border: `1px solid ${selected ? "rgba(40, 167, 69, 0.65)" : "rgba(255, 255, 255, 0.08)"}`,
  };
}

function GroupTournamentPage() {
  const container = document.getElementById("group-tournament-root");
  const groupTournamentId = container?.dataset?.groupTournamentId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLang, setSelectedLang] = useState("");
  const [editorValue, setEditorValue] = useState("");
  const [selectedSolutionId, setSelectedSolutionId] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedPane, setSelectedPane] = useState("solution");
  const [viewerFullscreen, setViewerFullscreen] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  const load = async () => {
    if (!groupTournamentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await requestJson(`/api/v1/group_tournaments/${groupTournamentId}`, {
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": window.csrf_token,
        },
      });

      setData(response);
      setSelectedLang(
        (current) => current || response.current_player?.lang || response.langs?.[0]?.slug || "",
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, 5000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupTournamentId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const latestSolution = data?.latestSolution;
  const currentPlayer = data?.currentPlayer;
  const joined = !!currentPlayer;
  const langs = data?.langs || EMPTY_ARRAY;
  const solutionHistory = data?.solutionHistory || EMPTY_ARRAY;
  const runHistory = data?.runs || EMPTY_ARRAY;
  const tournament = data?.groupTournament;
  const selectedRun = runHistory.find((run) => run.id === selectedRunId) || runHistory[0] || null;
  const selectedSolution =
    solutionHistory.find((solution) => solution.id === selectedSolutionId) ||
    latestSolution ||
    null;

  const editorSyntax = useMemo(
    () =>
      selectedSolution?.lang || latestSolution?.lang || currentPlayer?.lang || selectedLang || "js",
    [selectedSolution?.lang, latestSolution?.lang, currentPlayer?.lang, selectedLang],
  );
  const editorLanguage = languages[editorSyntax] || "javascript";

  const timeline = useMemo(() => {
    if (!tournament) return null;

    const roundsCount = tournament.roundsCount || 0;
    const roundTimeoutSeconds = tournament.roundTimeoutSeconds || 0;
    const totalDurationSeconds = roundsCount * roundTimeoutSeconds;
    const startMs = tournament.startedAt
      ? new Date(tournament.startedAt).getTime()
      : tournament.startsAt
        ? new Date(tournament.startsAt).getTime()
        : null;

    const endMs =
      startMs && totalDurationSeconds > 0 ? startMs + totalDurationSeconds * 1000 : null;
    const elapsedSeconds = startMs ? Math.floor((currentTimeMs - startMs) / 1000) : 0;
    const clampedElapsedSeconds = clamp(elapsedSeconds, 0, totalDurationSeconds);
    const remainingSeconds = Math.max(totalDurationSeconds - clampedElapsedSeconds, 0);
    const progressPercent =
      totalDurationSeconds > 0 ? (clampedElapsedSeconds / totalDurationSeconds) * 100 : 0;
    const startsInSeconds = startMs
      ? Math.max(Math.ceil((startMs - currentTimeMs) / 1000), 0)
      : null;

    const milestones = Array.from({ length: roundsCount + 1 }, (_value, index) => {
      const offsetSeconds = index * roundTimeoutSeconds;
      const positionPercent =
        totalDurationSeconds > 0 ? (offsetSeconds / totalDurationSeconds) * 100 : 0;

      if (index === 0) {
        return {
          key: "start",
          label: "Start",
          offsetSeconds,
          positionPercent,
          isCurrent: false,
          isPast: tournament.state !== "waiting_participants",
        };
      }

      return {
        key: `round-${index}`,
        label: `R${index}`,
        offsetSeconds,
        positionPercent,
        isCurrent: tournament.state === "active" && tournament.currentRoundPosition === index,
        isPast:
          tournament.state === "finished" || tournament.state === "canceled"
            ? true
            : (tournament.currentRoundPosition || 0) > index,
      };
    });

    return {
      totalDurationSeconds,
      remainingSeconds,
      progressPercent,
      startsInSeconds,
      endMs,
      roundsCount,
      roundTimeoutSeconds,
      clampedElapsedSeconds,
      milestones,
    };
  }, [currentTimeMs, tournament]);

  const timelineSegments = useMemo(() => {
    if (!timeline || timeline.roundsCount <= 0 || timeline.roundTimeoutSeconds <= 0) {
      return [];
    }

    return Array.from({ length: timeline.roundsCount }, (_value, index) => {
      const startSeconds = index * timeline.roundTimeoutSeconds;
      const endSeconds = startSeconds + timeline.roundTimeoutSeconds;
      const leftPercent = (startSeconds / timeline.totalDurationSeconds) * 100;
      const widthPercent = (timeline.roundTimeoutSeconds / timeline.totalDurationSeconds) * 100;
      let fillPercent = 0;
      let backgroundColor = "#28a745";

      if (timeline.clampedElapsedSeconds >= endSeconds) {
        fillPercent = 100;
        backgroundColor = "#dc3545";
      } else if (timeline.clampedElapsedSeconds > startSeconds) {
        const roundElapsed = timeline.clampedElapsedSeconds - startSeconds;
        fillPercent = clamp((roundElapsed / timeline.roundTimeoutSeconds) * 100, 0, 100);
        backgroundColor = roundProgressColor(roundElapsed / timeline.roundTimeoutSeconds);
      }

      return {
        key: `segment-${index + 1}`,
        leftPercent,
        widthPercent,
        fillPercent,
        backgroundColor,
      };
    });
  }, [timeline]);

  useEffect(() => {
    if (!data) return;

    const solutionToShow =
      solutionHistory.find((solution) => solution.id === selectedSolutionId) || latestSolution;

    if (solutionToShow) {
      setEditorValue(solutionToShow.solution || "");
      setSelectedSolutionId(solutionToShow.id);
      return;
    }

    setEditorValue("");
    setSelectedSolutionId(null);
  }, [data, latestSolution, selectedSolutionId, solutionHistory]);

  useEffect(() => {
    if (selectedRun) {
      setSelectedRunId(selectedRun.id);
      return;
    }

    setSelectedRunId(null);
  }, [selectedRun]);

  const handleJoin = async () => {
    if (!selectedLang) return;

    setJoining(true);
    setError(null);

    try {
      await requestJson(`/api/v1/group_tournaments/${groupTournamentId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": window.csrf_token,
        },
        body: JSON.stringify({ lang: selectedLang }),
      });

      await load();
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data?.errors || {}));
    } finally {
      setJoining(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!joined) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await requestJson(
        `/api/v1/group_tournaments/${groupTournamentId}/submit_solution`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": window.csrf_token,
          },
          body: JSON.stringify({ solution: editorValue }),
        },
      );

      setSelectedSolutionId(response.solution?.id || null);
      setSelectedPane("solution");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data?.errors || {}));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return <div className="container py-4 text-white">Loading group tournament...</div>;
  }

  if (error && !data) {
    return <div className="container py-4 text-danger">{error}</div>;
  }

  return (
    <div className="container-fluid py-3">
      <div className="row">
        <div className="col-12 mb-3">
          <div className="cb-bg-panel shadow-sm cb-rounded p-3">
            {timeline ? (
              <div>
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-2">
                  <div className="text-white">
                    {data.groupTournament.name}
                    <span className="cb-text ml-2">{data.groupTournament.state}</span>
                    {data.groupTournament.state === "waiting_participants" &&
                      timeline.startsInSeconds !== null
                      ? ` • starts in ${formatDuration(timeline.startsInSeconds)}`
                      : ""}
                  </div>
                  <div className="cb-text">
                    {data.groupTournament.state === "finished"
                      ? "Finished"
                      : `${formatDuration(timeline.remainingSeconds)} left / ${formatDuration(timeline.totalDurationSeconds)}`}
                  </div>
                </div>

                <div className="position-relative">
                  <div
                    className="progress"
                    style={{ height: "18px", backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                  >
                    {timelineSegments.map((segment) => (
                      <div
                        key={segment.key}
                        className="position-absolute"
                        style={{
                          left: `${segment.leftPercent}%`,
                          width: `${segment.widthPercent}%`,
                          top: 0,
                          bottom: 0,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${segment.fillPercent}%`,
                            height: "100%",
                            backgroundColor: segment.backgroundColor,
                          }}
                        />
                      </div>
                    ))}
                    {timelineSegments.map((segment) => (
                      <div
                        key={`${segment.key}-border`}
                        className="position-absolute"
                        style={{
                          left: `${segment.leftPercent}%`,
                          width: `${segment.widthPercent}%`,
                          top: 0,
                          bottom: 0,
                          borderRight: "1px solid rgba(15, 23, 42, 0.28)",
                          pointerEvents: "none",
                        }}
                      />
                    ))}
                  </div>

                  {timeline.milestones.map((milestone, index) => (
                    <div
                      key={milestone.key}
                      className="position-absolute"
                      style={{
                        left: `${milestone.positionPercent}%`,
                        top: "9px",
                        transform:
                          index === 0
                            ? "translate(-20%, -50%)"
                            : index === timeline.milestones.length - 1
                              ? "translate(-80%, -50%)"
                              : "translate(-50%, -50%)",
                        width: "12px",
                        height: "12px",
                        borderRadius: "999px",
                        backgroundColor: milestone.isCurrent
                          ? "#5bc0eb"
                          : milestone.isPast
                            ? "#28a745"
                            : "rgba(255, 255, 255, 0.45)",
                        border: "2px solid rgba(15, 23, 42, 0.95)",
                        zIndex: 2,
                      }}
                    />
                  ))}
                </div>

                <div className="position-relative mt-3 pt-2">
                  {timeline.milestones.map((milestone, index) => (
                    <div
                      key={milestone.key}
                      className="position-absolute text-center"
                      style={{
                        left: `${milestone.positionPercent}%`,
                        top: 0,
                        transform:
                          index === 0
                            ? "translateX(0)"
                            : index === timeline.milestones.length - 1
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                        minWidth: "70px",
                      }}
                    >
                      <div className="text-white small mt-2">{milestone.label}</div>
                      <div className="cb-text small">{formatDuration(milestone.offsetSeconds)}</div>
                    </div>
                  ))}
                  <div style={{ height: "52px" }} />
                </div>
              </div>
            ) : null}

            {!joined ? (
              <div className="mt-4 d-flex align-items-end flex-wrap">
                <div className="mr-3">
                  <label htmlFor="group-tournament-lang" className="form-label text-white">
                    Language
                  </label>
                  <select
                    id="group-tournament-lang"
                    className="form-control cb-bg-panel cb-border-color text-white"
                    value={selectedLang}
                    onChange={(event) => setSelectedLang(event.target.value)}
                  >
                    <option value="">Select language</option>
                    {langs.map((lang) => (
                      <option key={lang.slug} value={lang.slug}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-success text-white cb-rounded"
                  onClick={handleJoin}
                  disabled={!selectedLang || joining}
                >
                  {joining ? "Joining..." : "Join Tournament"}
                </button>
              </div>
            ) : null}

            {error ? <div className="mt-3 text-danger">{error}</div> : null}
          </div>
        </div>

        <div className="col-lg-10 mb-3">
          {selectedPane === "solution" ? (
            <div className="cb-bg-panel shadow-sm cb-rounded p-3 mb-3" style={{ height: "70vh" }}>
              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                <div className="text-white">
                  {data.groupTournament.groupTaskSlug}
                  {selectedSolution?.lang
                    ? ` • ${selectedSolution.lang}`
                    : currentPlayer?.lang
                      ? ` • ${currentPlayer.lang}`
                      : ""}
                </div>
                {joined ? (
                  <button
                    type="button"
                    className="btn btn-success text-white cb-rounded mt-2 mt-sm-0"
                    onClick={handleSubmitSolution}
                    disabled={submitting}
                  >
                    {submitting ? "Sending..." : "Send Solution"}
                  </button>
                ) : null}
              </div>
              <MonacoEditor
                theme="vs-dark"
                language={editorLanguage}
                value={editorValue}
                onChange={(value) => setEditorValue(value || "")}
                options={{
                  readOnly: !joined || loading || submitting,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  lineNumbers: "on",
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  stickyScroll: { enabled: false },
                }}
                width="100%"
                height="100%"
              />
            </div>
          ) : (
            <>
              <div className="cb-bg-panel shadow-sm cb-rounded p-4 mb-3" style={{ height: "82vh" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="text-white" style={{ fontSize: "1.6rem", lineHeight: 1.2 }}>
                    Run Viewer{selectedRun ? ` • Run #${selectedRun.id}` : ""}
                  </div>
                  {selectedRun?.result?.viewerHtml ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                      onClick={() => setViewerFullscreen(true)}
                    >
                      Fullscreen
                    </button>
                  ) : null}
                </div>
                {selectedRun?.result?.viewerHtml ? (
                  <iframe
                    title={`run-viewer-${selectedRun.id}`}
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
                ) : (
                  <div className="cb-text">No viewer HTML for this run.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="col-lg-2 mb-3">
          <div className="cb-bg-panel shadow-sm cb-rounded p-4 mb-3">
            <h3 className="text-white mb-3" style={{ fontSize: "1.2rem", lineHeight: 1.1 }}>
              Solution History
            </h3>
            <div className="mt-3">
              {solutionHistory.length === 0 ? (
                <div className="cb-text">No solutions yet.</div>
              ) : (
                <div className="list-group" style={{ maxHeight: "240px", overflowY: "auto" }}>
                  {solutionHistory.map((solution, index) => (
                    <button
                      key={solution.id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      style={historyItemStyle(selectedSolutionId === solution.id)}
                      onClick={() => {
                        setSelectedPane("solution");
                        setSelectedSolutionId(solution.id);
                        setEditorValue(solution.solution || "");
                      }}
                    >
                      <div>{`#${index + 1}`}</div>
                      <small className="d-block">{formatTime(solution.insertedAt)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="cb-bg-panel shadow-sm cb-rounded p-4">
            <h3 className="text-white mb-3" style={{ fontSize: "1.2rem", lineHeight: 1.1 }}>
              Run History
            </h3>
            <div className="mt-3">
              {runHistory.length === 0 ? (
                <div className="cb-text">No runs yet.</div>
              ) : (
                <div className="list-group" style={{ maxHeight: "240px", overflowY: "auto" }}>
                  {runHistory.map((run, index) => (
                    <button
                      key={run.id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      style={historyItemStyle(selectedRunId === run.id)}
                      onClick={() => {
                        setSelectedPane("run");
                        setSelectedRunId(run.id);
                      }}
                    >
                      <div>{`#${index + 1}`}</div>
                      <small className="d-block">{formatTime(run.insertedAt)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewerFullscreen && selectedRun?.result?.viewerHtml ? (
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
              Run Viewer Fullscreen{selectedRun ? ` • Run #${selectedRun.id}` : ""}
            </div>
            <button
              type="button"
              className="btn btn-outline-light cb-rounded"
              onClick={() => setViewerFullscreen(false)}
            >
              Close Fullscreen
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
      ) : null}
    </div>
  );
}

export default GroupTournamentPage;
