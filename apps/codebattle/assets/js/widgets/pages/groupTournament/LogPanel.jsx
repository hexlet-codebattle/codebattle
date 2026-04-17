import React from "react";

function LogPanel({ logs, className }) {
  return (
    <div
      className={`card cb-card border cb-border-color rounded sm-shadow mt-2 ${className || ""}`}
      style={{ height: "29%" }}
    >
      <div className="card-header">
        <h6 className="cb-text mb-0">Execution Logs</h6>
      </div>
      <div className="card-body p-3 border-top cb-border-color overflow-auto">
        {logs && logs.length > 0 ? (
          <div className="mt-2 small">
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
