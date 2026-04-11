import React, { useState, useCallback, useMemo } from "react";

import cn from "classnames";
import Gon from "gon";
import { camelizeKeys, decamelizeKeys } from "humps";

import GameLevelBadge from "../../components/GameLevelBadge";
import TaskDescriptionMarkdown from "../game/TaskDescriptionMarkdown";

const taskData = Gon.getAsset("task");
const taskStatsData = Gon.getAsset("task_stats");
const canEditTask = Gon.getAsset("can_edit_task") || false;

const initialTask = taskData ? camelizeKeys(taskData) : null;
const taskStats = taskStatsData ? camelizeKeys(taskStatsData) : null;

const levelOptions = ["elementary", "easy", "medium", "hard"];
const visibilityOptions = ["public", "hidden"];
const stateOptions = ["blank", "draft", "on_moderation", "active", "disabled"];

const levelBadgeClasses = {
  elementary: "badge-success",
  easy: "badge-info",
  medium: "badge-warning",
  hard: "badge-danger",
};

const stateLabels = {
  blank: { label: "Blank", cls: "badge-secondary" },
  draft: { label: "Draft", cls: "badge-secondary" },
  on_moderation: { label: "On Moderation", cls: "badge-warning" },
  active: { label: "Active", cls: "badge-success" },
  disabled: { label: "Disabled", cls: "badge-danger" },
};

function formatDuration(seconds) {
  if (seconds == null) return "-";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function getCsrfToken() {
  return (
    window.csrf_token || document.querySelector("meta[name='csrf-token']")?.getAttribute("content")
  );
}

async function patchTask(taskId, params) {
  const response = await fetch(`/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": getCsrfToken(),
    },
    body: JSON.stringify({ task: decamelizeKeys(params, { separator: "_" }) }),
  });

  if (!response.ok) throw new Error("Failed to update task");
  const data = await response.json();
  return camelizeKeys(data.task);
}

function EditableSelect({ value, options, onChange, disabled }) {
  return (
    <select
      className="custom-select custom-select-sm cb-bg-panel cb-border-color text-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function EditableTagsInput({ value, onChange, disabled, inputId }) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const tag = inputValue.trim().toLowerCase();
      if (!value.includes(tag)) {
        onChange([...value, tag]);
      }
      setInputValue("");
    }
  };

  const removeTag = (tag) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div>
      <div className="d-flex flex-wrap mb-1">
        {value.map((tag) => (
          <span key={tag} className="badge badge-dark mr-1 mb-1 d-flex align-items-center">
            {tag}
            {!disabled && (
              <button
                type="button"
                className="close ml-1 text-white"
                style={{ fontSize: "0.8rem", lineHeight: 1 }}
                onClick={() => removeTag(tag)}
              >
                &times;
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <input
          id={inputId}
          type="text"
          className="form-control form-control-sm cb-bg-panel cb-border-color text-white"
          placeholder="Add tag..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="d-flex flex-column align-items-center p-3 cb-bg-highlight-panel cb-rounded flex-fill">
      <small className="cb-text text-uppercase" style={{ letterSpacing: 1 }}>
        {label}
      </small>
      <span className="h4 mb-0 mt-1 text-white font-weight-bold">{value}</span>
    </div>
  );
}

function PercentileBar({ percentiles }) {
  if (!percentiles || percentiles.count === 0) {
    return <p className="cb-text font-italic py-2 mb-0">No solve time data yet</p>;
  }

  const entries = [
    { key: "p10", label: "P10", cls: "bg-success" },
    { key: "p30", label: "P30", cls: "bg-success" },
    { key: "p50", label: "P50 (median)", cls: "bg-warning" },
    { key: "p75", label: "P75", cls: "bg-warning" },
    { key: "p95", label: "P95", cls: "bg-danger" },
  ];

  const maxVal = percentiles.p95 || 1;

  return (
    <div>
      {entries.map(({ key, label, cls }) => {
        const val = percentiles[key];
        if (val == null) return null;
        const pct = Math.min((val / maxVal) * 100, 100);
        return (
          <div key={key} className="d-flex align-items-center mb-2">
            <span className="cb-text small" style={{ width: 110, flexShrink: 0 }}>
              {label}
            </span>
            <div
              className="flex-grow-1 cb-bg-highlight-panel rounded overflow-hidden"
              style={{ height: 24 }}
            >
              <div
                className={cn("h-100 rounded", cls)}
                style={{ width: `${pct}%`, minWidth: 2, transition: "width 0.5s ease" }}
              />
            </div>
            <span
              className="text-white small font-weight-bold text-right"
              style={{ width: 70, flexShrink: 0 }}
            >
              {formatDuration(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SignatureDisplay({ inputSignature, outputSignature }) {
  if ((!inputSignature || inputSignature.length === 0) && !outputSignature) return null;

  const formatType = (sig) => {
    if (!sig || !sig.type) return "unknown";
    const t = sig.type;
    if (t.nested) return `${t.name}<${formatType({ type: t.nested })}>`;
    return t.name;
  };

  return (
    <div className="cb-bg-highlight-panel cb-rounded p-3 font-monospace small">
      <span className="text-info">function</span>
      {" solution("}
      {inputSignature &&
        inputSignature.map((sig, i) => (
          <span key={sig.argumentName || i}>
            {i > 0 && ", "}
            <span className="text-white">{sig.argumentName}</span>
            <span className="cb-text">: </span>
            <span className="text-warning">{formatType(sig)}</span>
          </span>
        ))}
      {") -> "}
      <span className="text-success">{outputSignature ? formatType(outputSignature) : "void"}</span>
    </div>
  );
}

function ExamplesTable({ examples }) {
  if (!examples || examples.length === 0) return null;

  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0">
        <thead>
          <tr className="cb-border-color border-bottom">
            <th className="cb-text border-0 px-3 py-2">#</th>
            <th className="cb-text border-0 px-3 py-2">Arguments</th>
            <th className="cb-text border-0 px-3 py-2">Expected</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((ex, i) => (
            <tr key={i} className="cb-border-color border-bottom">
              <td className="border-0 px-3 py-2 cb-text font-monospace">{i + 1}</td>
              <td className="border-0 px-3 py-2">
                <code className="text-info bg-transparent">{JSON.stringify(ex.arguments)}</code>
              </td>
              <td className="border-0 px-3 py-2">
                <code className="text-success bg-transparent">{JSON.stringify(ex.expected)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Leaderboard({ entries }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
      <div className="card-body">
        <h5 className="mb-3 text-white font-weight-bold">Fastest Solutions</h5>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr className="cb-border-color border-bottom">
                <th className="cb-text border-0 px-2 py-2">#</th>
                <th className="cb-text border-0 px-2 py-2">Player</th>
                <th className="cb-text border-0 px-2 py-2">Time</th>
                <th className="cb-text border-0 px-2 py-2">Lang</th>
                <th className="cb-text border-0 px-2 py-2">Game</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.gameId} className="cb-border-color border-bottom">
                  <td className="border-0 px-2 py-2 cb-text">{i + 1}</td>
                  <td className="border-0 px-2 py-2">
                    <a href={`/users/${entry.userId}`} className="text-white text-decoration-none">
                      {entry.userName}
                    </a>
                    <small className="ml-1 cb-text">({entry.rating})</small>
                  </td>
                  <td className="border-0 px-2 py-2 text-white font-weight-bold">
                    {formatDuration(entry.durationSec)}
                  </td>
                  <td className="border-0 px-2 py-2 cb-text">{entry.lang}</td>
                  <td className="border-0 px-2 py-2">
                    <a
                      href={`/games/${entry.gameId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-info"
                    >
                      #{entry.gameId}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, children }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 cb-border-color border-bottom">
      <dt className="cb-text font-weight-normal small mb-0">{label}</dt>
      <dd className="mb-0 text-white small">{children}</dd>
    </div>
  );
}

function AssertsSection({ asserts }) {
  const [expanded, setExpanded] = useState(false);
  const displayAsserts = expanded ? asserts : asserts.slice(0, 3);

  return (
    <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 text-white font-weight-bold">Test Cases ({asserts.length})</h5>
          {asserts.length > 3 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : `Show all ${asserts.length}`}
            </button>
          )}
        </div>
        <ExamplesTable examples={displayAsserts} />
      </div>
    </div>
  );
}

function TaskPreviewWidget() {
  const [task, setTask] = useState(initialTask);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [descLang, setDescLang] = useState("en");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const description = useMemo(() => {
    if (!task) return "";
    return descLang === "ru" && task.descriptionRu ? task.descriptionRu : task.descriptionEn || "";
  }, [task, descLang]);

  const hasRuDescription = task && task.descriptionRu && task.descriptionRu.length > 0;

  const updateField = useCallback(
    async (field, value) => {
      if (!task) return;
      setIsSaving(true);
      try {
        const updated = await patchTask(task.id, { [field]: value });
        setTask(updated);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to update:", e);
      } finally {
        setIsSaving(false);
      }
    },
    [task],
  );

  const handlePlayTask = useCallback(async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/games/create_by_task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify({ task_id: task.id }),
      });

      if (response.ok) {
        const data = await response.json();
        window.open(`/games/${data.game_id}`, "_blank");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to create game:", e);
    } finally {
      setIsCreating(false);
    }
  }, [task]);

  const startEditDesc = useCallback(() => {
    setDescDraft(descLang === "ru" ? task.descriptionRu || "" : task.descriptionEn || "");
    setEditingDesc(true);
  }, [task, descLang]);

  const saveDesc = useCallback(async () => {
    const field = descLang === "ru" ? "descriptionRu" : "descriptionEn";
    await updateField(field, descDraft);
    setEditingDesc(false);
  }, [descLang, descDraft, updateField]);

  if (!task) {
    return (
      <div
        className="d-flex justify-content-center align-items-center cb-text"
        style={{ minHeight: "50vh" }}
      >
        Task not found
      </div>
    );
  }

  const stateInfo = stateLabels[task.state] || stateLabels.blank;

  return (
    <div className="cb-bg-panel cb-text min-vh-100">
      {/* Header */}
      <div className="cb-bg-highlight-panel cb-border-color border-bottom py-4">
        <div className="container">
          <div className="d-flex align-items-center mb-3 small">
            <a href="/tasks" className="text-info">
              Tasks
            </a>
            <span className="mx-2 cb-text">/</span>
            <span className="cb-text">{task.name}</span>
            {isSaving && (
              <span className="ml-2 text-warning small">
                <span className="spinner-border spinner-border-sm mr-1" />
                Saving...
              </span>
            )}
          </div>

          <div className="d-flex flex-wrap align-items-center mb-3">
            <GameLevelBadge level={task.level} />
            <h1 className="mb-0 ml-3 h3 text-white font-weight-bold">{task.name}</h1>
          </div>

          <div className="d-flex flex-wrap align-items-center">
            <span className={cn("badge mr-2 mb-1", levelBadgeClasses[task.level])}>
              {task.level}
            </span>
            <span className={cn("badge mr-2 mb-1", stateInfo.cls)}>{stateInfo.label}</span>
            {task.origin && <span className="badge badge-dark mr-2 mb-1">{task.origin}</span>}
            {task.visibility && (
              <span
                className={cn(
                  "badge mr-2 mb-1",
                  task.visibility === "public" ? "badge-success" : "badge-secondary",
                )}
              >
                {task.visibility}
              </span>
            )}
            {task.tags &&
              task.tags.map((tag) => (
                <span key={tag} className="badge badge-dark mr-2 mb-1">
                  {tag}
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="container py-4">
        <div className="row">
          {/* Main content */}
          <div className="col-lg-8">
            {/* Description */}
            <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 text-white font-weight-bold">Description</h5>
                  <div className="d-flex align-items-center">
                    {hasRuDescription && (
                      <div className="btn-group btn-group-sm mr-2">
                        <button
                          type="button"
                          className={cn(
                            "btn btn-sm",
                            descLang === "en"
                              ? "btn-primary"
                              : "btn-outline-secondary cb-btn-outline-secondary",
                          )}
                          onClick={() => {
                            setDescLang("en");
                            setEditingDesc(false);
                          }}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "btn btn-sm",
                            descLang === "ru"
                              ? "btn-primary"
                              : "btn-outline-secondary cb-btn-outline-secondary",
                          )}
                          onClick={() => {
                            setDescLang("ru");
                            setEditingDesc(false);
                          }}
                        >
                          RU
                        </button>
                      </div>
                    )}
                    {canEditTask && !editingDesc && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                        onClick={startEditDesc}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {editingDesc ? (
                  <div>
                    <textarea
                      className="form-control cb-bg-highlight-panel cb-border-color text-white mb-2"
                      rows={12}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                    />
                    <div className="d-flex justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded mr-2"
                        onClick={() => setEditingDesc(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-success cb-rounded"
                        onClick={saveDesc}
                        disabled={isSaving}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-white">
                    <TaskDescriptionMarkdown description={description} />
                  </div>
                )}
              </div>
            </div>

            {/* Signature */}
            <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
              <div className="card-body">
                <h5 className="mb-3 text-white font-weight-bold">Function Signature</h5>
                <SignatureDisplay
                  inputSignature={task.inputSignature}
                  outputSignature={task.outputSignature}
                />
              </div>
            </div>

            {/* Examples */}
            {task.assertsExamples && task.assertsExamples.length > 0 && (
              <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
                <div className="card-body">
                  <h5 className="mb-3 text-white font-weight-bold">Examples</h5>
                  <ExamplesTable examples={task.assertsExamples} />
                </div>
              </div>
            )}

            {/* All asserts */}
            {task.asserts && task.asserts.length > 0 && <AssertsSection asserts={task.asserts} />}

            {/* Stats */}
            {taskStats && (
              <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
                <div className="card-body">
                  <h5 className="mb-3 text-white font-weight-bold">Statistics</h5>
                  <div className="d-flex mb-3" style={{ gap: 12 }}>
                    <StatCard label="Games" value={taskStats.gamesCount} />
                    <StatCard label="Winners" value={taskStats.winnersCount} />
                  </div>

                  <h6
                    className="mt-3 mb-3 cb-text small text-uppercase"
                    style={{ letterSpacing: 1 }}
                  >
                    Solve Time (winners)
                  </h6>
                  <PercentileBar percentiles={taskStats.percentiles} />
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {taskStats && <Leaderboard entries={taskStats.leaderboard} />}
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            {/* Play button */}
            <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
              <div className="card-body">
                <button
                  type="button"
                  className="btn btn-success btn-lg btn-block cb-rounded font-weight-bold"
                  onClick={handlePlayTask}
                  disabled={isCreating || task.state !== "active"}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" />
                      Creating game...
                    </>
                  ) : (
                    "Play this task"
                  )}
                </button>
                {task.state !== "active" && (
                  <small className="d-block text-center mt-2 cb-text">
                    Task must be active to play
                  </small>
                )}
              </div>
            </div>

            {/* Editable Details */}
            <div className="card cb-bg-panel cb-border-color cb-rounded border mb-4">
              <div className="card-body">
                <h5 className="mb-3 text-white font-weight-bold">Details</h5>
                <dl className="mb-0">
                  <MetaRow label="ID">{task.id}</MetaRow>

                  <MetaRow label="Level">
                    {canEditTask ? (
                      <EditableSelect
                        value={task.level}
                        options={levelOptions}
                        onChange={(v) => updateField("level", v)}
                        disabled={isSaving}
                      />
                    ) : (
                      task.level
                    )}
                  </MetaRow>

                  <MetaRow label="State">
                    {canEditTask ? (
                      <EditableSelect
                        value={task.state}
                        options={stateOptions}
                        onChange={(v) => updateField("state", v)}
                        disabled={isSaving}
                      />
                    ) : (
                      stateInfo.label
                    )}
                  </MetaRow>

                  <MetaRow label="Visibility">
                    {canEditTask ? (
                      <EditableSelect
                        value={task.visibility}
                        options={visibilityOptions}
                        onChange={(v) => updateField("visibility", v)}
                        disabled={isSaving}
                      />
                    ) : (
                      task.visibility
                    )}
                  </MetaRow>

                  <MetaRow label="Type">{task.type || "algorithms"}</MetaRow>
                  <MetaRow label="Origin">{task.origin}</MetaRow>
                  {task.timeToSolveSec && (
                    <MetaRow label="Time to solve">{formatDuration(task.timeToSolveSec)}</MetaRow>
                  )}
                  {task.creatorId && <MetaRow label="Creator ID">{task.creatorId}</MetaRow>}
                  {task.insertedAt && (
                    <MetaRow label="Created">
                      {new Date(task.insertedAt).toLocaleDateString()}
                    </MetaRow>
                  )}
                  {task.updatedAt && (
                    <MetaRow label="Updated">
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </MetaRow>
                  )}
                </dl>

                {canEditTask && (
                  <div className="mt-3 pt-3 cb-border-color border-top">
                    <label htmlFor="task-preview-tags-input" className="cb-text small mb-1">
                      Tags
                    </label>
                    <EditableTagsInput
                      inputId="task-preview-tags-input"
                      value={task.tags || []}
                      onChange={(v) => updateField("tags", v)}
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskPreviewWidget;
