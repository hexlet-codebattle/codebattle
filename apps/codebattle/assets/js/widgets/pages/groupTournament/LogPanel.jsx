import React from "react";

function LogPanel({ logs, className }) {
  return (
    <div className={`card border rounded max-vh-33 h-100 ${className || ""}`}>
      <div className="card-header py-2">
        <h6 className="mb-0">Execution Logs</h6>
      </div>
      <div className="card-body p-3 border-top overflow-auto">
        {/* LogPanel component placeholder */}
        {logs && logs.length > 0 && (
          <div className="mt-2 small">
            <ul className="list-unstyled mb-0">
              {logs.slice(0, 3).map((log, idx) => (
                <li key={idx} className="text-truncate">
                  • {log}
                </li>
              ))}
              {logs.length > 3 && <li>... and {logs.length - 3} more</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default LogPanel;
