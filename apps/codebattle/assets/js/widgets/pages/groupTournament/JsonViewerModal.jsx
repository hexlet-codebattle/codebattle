import MonacoEditor from "@monaco-editor/react";
import React, { useMemo, useState } from "react";
import i18n from "../../../i18n";

function JsonViewerModal({ open, title, value, onClose }) {
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    if (value == null) return "";
    if (typeof value === "string") {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div
      className="position-fixed d-flex flex-column"
      style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1060, background: "#1e1e1e" }}
    >
      <div
        className="d-flex justify-content-between align-items-center px-3 py-2"
        style={{ background: "#252526" }}
      >
        <h6 className="text-white mb-0">{title}</h6>
        <div className="d-flex align-items-center">
          <button
            type="button"
            className="btn btn-sm btn-success mr-2"
            onClick={handleCopy}
            disabled={!formatted}
          >
            {copied ? i18n.t("Copied!") : i18n.t("Copy")}
          </button>
          <button type="button" className="btn btn-sm btn-outline-light" onClick={onClose}>
            {i18n.t("Close")}
          </button>
        </div>
      </div>
      <div className="flex-grow-1">
        <MonacoEditor
          theme="vs-dark"
          language="json"
          value={formatted}
          options={{
            readOnly: true,
            wordWrap: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: "on",
            renderLineHighlight: "none",
            contextmenu: true,
          }}
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}

export default JsonViewerModal;
