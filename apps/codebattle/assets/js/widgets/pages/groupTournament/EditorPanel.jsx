import MonacoEditor from "@monaco-editor/react";
import React from "react";
import languages from "../../config/languages";
import useEditor from "../../utils/useEditor";

function EditorPanel({ text, lang }) {
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

  return (
    <div
      className="card cb-card border cb-border-color rounded shadow-sm"
      style={{ height: "70%" }}
    >
      <div className="card-header d-flex justify-content-between py-2">
        <h6 className="cb-text mb-0">Editor</h6>
        <h6 className="cb-text mb-0">{lang ? `Language: ${mappedSyntax}` : ""}</h6>
      </div>
      <div className="card-body p-0 pb-1 border-top cb-border-color">
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
      </div>
    </div>
  );
}

export default EditorPanel;
