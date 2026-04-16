import React from "react";

function MainPanel({ status }) {
  return (
    <div className="card border rounded">
      <div className="card-header py-2">
        <h6 className="mb-0">Tournament Overview</h6>
        <small className="text-muted">Current status and controls</small>
      </div>
      <div className="card-body p-3 border-top max-vh-50 overflow-auto">
        {/* MainPanel component placeholder */}
        <p className="text-muted mb-0">Main content area for tournament information and actions.</p>
      </div>
    </div>
  );
}

export default MainPanel;
