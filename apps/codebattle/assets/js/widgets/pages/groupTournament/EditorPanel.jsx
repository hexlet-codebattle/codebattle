import MonacoEditor from "@monaco-editor/react";
import React from "react";
import i18n from "../../../i18n";
import languages from "../../config/languages";
import useEditor from "../../utils/useEditor";

function EditorPanel({ text, lang, editorFullscreen, setEditorFullscreen }) {
  const mappedSyntax = lang ? languages[lang] : "javascript";

  const editorProps = {
    wordWrap: "on",
    placeholder: "",
    lineNumbers: text ? "on" : "off",
    fontSize: 14,
    editable: false,
    renderLineHighlight: "none",
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    roomMode: "group_tournament",
    checkResult: () => {},
    toggleMuteSound: () => {},
    mute: false,
    userType: "spectator",
    userId: 0,
    onChangeCursorSelection: () => {},
    onChangeCursorPosition: () => {},
    syntax: mappedSyntax,
    gameStartTimeMs: 0,
    onTelemetryEvent: () => {},
    loading: false,
    canSendCursor: false,
  };

  const { options, handleEditorWillMount, handleEditorDidMount } = useEditor(editorProps);

  const editor = (
    <MonacoEditor
      theme="vs-dark"
      language={mappedSyntax}
      value={text || ""}
      options={options}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      width="100%"
      height="100%"
    />
  );

  return (
    <>
      <div
        className="card cb-card border cb-border-color rounded shadow-sm"
        style={{ height: "70%" }}
      >
        <div className="card-header py-3 border-bottom cb-border-color">
          <h6 className="cb-text mb-0">
            {i18n.t("Editor")} {lang ? `— ${lang}` : ""}
            <span
              role="button"
              tabIndex={0}
              className="float-right"
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => setEditorFullscreen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setEditorFullscreen(true);
              }}
            >
              {i18n.t("Fullscreen")}
            </span>
          </h6>
        </div>
        <div className="card-body p-0 pb-1 border-top cb-border-color">{editor}</div>
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
            <h6 className="text-white mb-0">
              {i18n.t("Editor")} — {lang || ""}
            </h6>
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={() => setEditorFullscreen(false)}
            >
              {i18n.t("Close")}
            </button>
          </div>
          <div className="flex-grow-1">{editor}</div>
        </div>
      )}
    </>
  );
}

export default EditorPanel;
