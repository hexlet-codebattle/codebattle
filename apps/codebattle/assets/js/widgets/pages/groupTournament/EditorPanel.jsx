import MonacoEditor from "@monaco-editor/react";
import React from "react";
import languages from "../../config/languages";
import useEditor from "../../utils/useEditor";

function EditorPanel({ text, lang }) {
  // Map language slug to Monaco language
  const mappedLanguage = lang ? languages[lang] || lang : "javascript";

  // Props for useEditor in readOnly mode with empty handlers
  const editorProps = {
    wordWrap: "on",
    lineNumbers: "on",
    fontSize: 14,
    editable: false,
    roomMode: "group_tournament",
    checkResult: () => { },
    toggleMuteSound: () => { },
    mute: false,
    userType: "spectator",
    userId: 0,
    onChangeCursorSelection: () => { },
    onChangeCursorPosition: () => { },
    syntax: lang || "javascript",
    gameStartTimeMs: 0,
    onTelemetryEvent: () => { },
    loading: false,
    canSendCursor: false,
  };

  const {
    options,
    handleEditorWillMount,
    handleEditorDidMount,
  } = useEditor(editorProps);

  return (
    <div className="card border rounded max-vh-66 h-100">
      <div className="card-header py-2">
        <h6 className="mb-0">Editor</h6>
        <small>{lang ? `Language: ${lang}` : ""}</small>
      </div>
      <div className="card-body p-3 border-top">
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
