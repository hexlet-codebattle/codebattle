import React from "react";
import i18n from "../../../i18n";

const statusBadge = {
  active: { className: "badge-success", labelKey: "Active" },
  finished: { className: "badge-secondary", labelKey: "Finished" },
  loading: { className: "badge-warning", labelKey: "Loading" },
};

function Header({ name, status }) {
  const badge = statusBadge[status] || statusBadge.loading;

  return (
    <div className="cb-bg-panel shadow-sm cb-rounded p-3 d-flex align-items-center justify-content-between w-100">
      <h4 className="mb-0">{name || i18n.t("Group Tournament")}</h4>
      <span className={`badge ${badge.className} px-3 py-2`}>{i18n.t(badge.labelKey)}</span>
    </div>
  );
}

export default Header;
