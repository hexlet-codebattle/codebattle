import React from "react";

function LogPanel({ logs, className }) {
  return (
    <div className={`cb-bg-panel shadow-sm cb-rounded max-vh-33 h-100 ${className || ""}`}>
      <div className="p-3 border-bottom cb-border-color">
        <h6 className="mb-0">Execution Logs</h6>
      </div>
      <div className="p-3 overflow-auto">
        {logs && logs.length > 0 ? (
          <div className="small">
            <ul className="list-unstyled mb-0">
              {logs.slice(0, 3).map((log, idx) => (
                <li key={idx} className="text-truncate">
                  {log}
                </li>
              ))}
              {logs.length > 3 && <li className="text-muted">... and {logs.length - 3} more</li>}
            </ul>
          </div>
        ) : (
          <div className="small text-muted">No logs yet</div>
        )}
      </div>
    </div>
  );
}

export default LogPanel;
