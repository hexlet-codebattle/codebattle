import React from "react";

function EvolutionPanel({ items, tournamentStatus, setRunId }) {
  return (
    <div className="card border rounded">
      <div className="card-header py-2">
        <h6 className="mb-0">Executions History</h6>
      </div>
      <div className="card-body p-3 border-top">
        <div className="cb-overflow-y-auto">
          {tournamentStatus !== "finished" && (
            <a href="_blank">+ Add Solution</a>
          )}
          {items && items.length > 0 && (
            <div className="mt-2 small">
              <div className="list-group list-group-flush">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setRunId(item.id)}
                    className="list-group-item px-0 py-1 border-0"
                  >
                    <span className="badge badge-secondary mr-2">v{idx + 1}</span>
                    <span className="text-truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvolutionPanel;
