import React from "react";
const statusBadge = {
  active: { className: "badge-success", label: "Active" },
  finished: { className: "badge-secondary", label: "Finished" },
  loading: { className: "badge-warning", label: "Loading" },
};

function Header({ name, status }) {
  const badge = statusBadge[status] || statusBadge.loading;

  return (
    <div className="cb-bg-panel shadow-sm cb-rounded p-3 d-flex align-items-center justify-content-between w-100">
      <h4 className="mb-0">{name || "Group Tournament"}</h4>
      <span className={`badge ${badge.className} px-3 py-2`}>{badge.label}</span>
    </div>
  );
}

export default Header;
