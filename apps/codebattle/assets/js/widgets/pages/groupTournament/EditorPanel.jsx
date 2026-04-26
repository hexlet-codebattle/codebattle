import MonacoEditor from "@monaco-editor/react";
import React, { useEffect, useMemo, useState } from "react";
import i18n from "../../../i18n";
import languages from "../../config/languages";
import useEditor from "../../utils/useEditor";

function EditorPanel({
  text,
  lang,
  editorFullscreen,
  setEditorFullscreen,
  editable = false,
  onSubmit,
  langs = [],
  currentLang,
}) {
  const [selectedLang, setSelectedLang] = useState(currentLang || lang || "js");
  const [draft, setDraft] = useState(text || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    setDraft(text || "");
  }, [text]);

  useEffect(() => {
    if (lang) {
      setSelectedLang(lang);
    } else if (editable && currentLang) {
      setSelectedLang(currentLang);
    }
  }, [lang, currentLang, editable]);

  const displayLang = editable ? selectedLang : lang;
  const mappedSyntax = displayLang ? languages[displayLang] || displayLang : "javascript";

  const editorProps = {
    wordWrap: "on",
    placeholder: "",
    lineNumbers: (editable ? draft : text) ? "on" : "off",
    fontSize: 14,
    editable,
    renderLineHighlight: editable ? "line" : "none",
    hideCursorInOverviewRuler: !editable,
    overviewRulerBorder: false,
    roomMode: "group_tournament",
    checkResult: () => {},
    toggleMuteSound: () => {},
    mute: false,
    userType: editable ? "player" : "spectator",
    userId: 0,
    onChangeCursorSelection: () => {},
    onChangeCursorPosition: () => {},
    syntax: mappedSyntax,
    gameStartTimeMs: 0,
    onTelemetryEvent: () => {},
    loading: false,
    canSendCursor: false,
    allowClipboard: editable,
  };

  const { options, handleEditorWillMount, handleEditorDidMount } = useEditor(editorProps);

  const langOptions = useMemo(
    () =>
      (langs || []).map((l) => ({
        slug: l.slug,
        label: `${l.name}${l.version ? ` ${l.version}` : ""}`,
      })),
    [langs],
  );

  const handleSubmit = async () => {
    if (!onSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(draft, selectedLang);
    } catch (err) {
      setSubmitError(err?.reason || err?.message || "submit_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const titleText = editable
    ? ""
    : `${i18n.t("Solution")}${displayLang ? ` — ${displayLang}` : ""}`;

  const langSelector = editable && langOptions.length > 0 && (
    <select
      className="form-control form-control-sm d-inline-block w-auto ml-2"
      value={selectedLang}
      onChange={(e) => setSelectedLang(e.target.value)}
      disabled={submitting}
      style={{
        backgroundColor: "#2a2a35",
        color: "#fff",
        border: "1px solid #3a3f50",
      }}
    >
      {langOptions.map((opt) => (
        <option
          key={opt.slug}
          value={opt.slug}
          style={{ backgroundColor: "#2a2a35", color: "#fff" }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );

  const editor = (
    <MonacoEditor
      theme="vs-dark"
      language={mappedSyntax}
      value={editable ? draft : text || ""}
      options={options}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      onChange={editable ? (value) => setDraft(value ?? "") : undefined}
      width="100%"
      height="100%"
    />
  );

  return (
    <>
      <div className="card cb-card border cb-border-color rounded shadow-sm">
        <div className="card-header py-2 border-bottom cb-border-color">
          <h6 className="cb-text mb-0 d-flex align-items-center justify-content-between">
            <span className="d-flex align-items-center">
              {titleText}
              {langSelector}
            </span>
            <span className="d-flex align-items-center">
              {editable && (
                <button
                  type="button"
                  className="btn btn-sm btn-success mr-3"
                  onClick={handleSubmit}
                  disabled={submitting || !draft || !selectedLang}
                >
                  {submitting ? i18n.t("Sending...") : i18n.t("Submit")}
                </button>
              )}
              <span
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setEditorFullscreen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setEditorFullscreen(true);
                }}
              >
                {i18n.t("Fullscreen")}
              </span>
            </span>
          </h6>
        </div>
        <div className="card-body p-0 border-top cb-border-color" style={{ height: "80vh" }}>
          {editor}
        </div>
        {editable && submitError && (
          <div className="card-footer py-2 border-top cb-border-color">
            <small className="text-danger">{submitError}</small>
          </div>
        )}
      </div>

      {editorFullscreen && (
        <div
          className="position-fixed d-flex flex-column"
          style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, background: "#1e1e1e" }}
        >
          <div
            className="d-flex justify-content-between align-items-center px-3 py-2"
            style={{ background: "#252526" }}
          >
            <h6 className="text-white mb-0 d-flex align-items-center">
              {titleText}
              {langSelector}
            </h6>
            <div className="d-flex align-items-center">
              {editable && (
                <button
                  type="button"
                  className="btn btn-sm btn-success mr-2"
                  onClick={handleSubmit}
                  disabled={submitting || !draft || !selectedLang}
                >
                  {submitting ? i18n.t("Sending...") : i18n.t("Submit")}
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                onClick={() => setEditorFullscreen(false)}
              >
                {i18n.t("Close")}
              </button>
            </div>
          </div>
          <div className="flex-grow-1">{editor}</div>
        </div>
      )}
    </>
  );
}

export default EditorPanel;
