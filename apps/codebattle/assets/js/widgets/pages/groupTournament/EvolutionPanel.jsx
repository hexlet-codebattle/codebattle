import React from "react";

const getExternalUrl = (url) => `${url}/browse/README.md?rev=main&chatMessage=""`;

function EvolutionPanel({ items, tournamentStatus, runId, setRunId, repoUrl }) {
  return (
    <div className="card cb-card border cb-border-color rounded h-100">
      <div className="card-header py-2">
        <h6 className="cb-text mb-0">Execution History</h6>
      </div>
      <div className="card-body p-1 border-top cb-border-color">
        <div className="cb-overflow-y-auto">
          {tournamentStatus !== "finished" && repoUrl && (
            <a href={getExternalUrl(repoUrl)} target="_blank" rel="noopener noreferrer">
              <div className="border cb-border-color rounded p-3">+ Add Solution</div>
            </a>
          )}
          {items && items.length > 0 && (
            <div className="mt-2 small">
              <div className="list-group list-group-flush">
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRunId(item.id)}
                    className="list-group-item list-group-item-action px-0 py-1 border-0 text-left bg-transparent"
                  >
                    <span className="badge badge-secondary mr-2">v{idx + 1}</span>
                    <span className="text-truncate">{item}</span>
                  </button>
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
