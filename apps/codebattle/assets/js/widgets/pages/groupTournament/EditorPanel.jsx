import MonacoEditor from "@monaco-editor/react";
import React from "react";
import languages from "../../config/languages";
import useEditor from "../../utils/useEditor";

function EditorPanel({ text, lang }) {
  const mappedLanguage = lang ? languages[lang] || lang : "javascript";

  const editorProps = {
    wordWrap: "on",
    lineNumbers: "on",
    fontSize: 14,
    editable: false,
    roomMode: "group_tournament",
    checkResult: () => {},
    toggleMuteSound: () => {},
    mute: false,
    userType: "spectator",
    userId: 0,
    onChangeCursorSelection: () => {},
    onChangeCursorPosition: () => {},
    syntax: lang || "javascript",
    gameStartTimeMs: 0,
    onTelemetryEvent: () => {},
    loading: false,
    canSendCursor: false,
  };

  const { options, handleEditorWillMount, handleEditorDidMount } = useEditor(editorProps);

  return (
    <div className="cb-bg-panel shadow-sm cb-rounded max-vh-66 h-100">
      <div className="p-3 border-bottom cb-border-color d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Editor</h6>
        {lang && <small className="text-muted">{lang}</small>}
      </div>
      <div className="p-3">
        <MonacoEditor
          theme="vs-dark"
          language={mappedLanguage}
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
