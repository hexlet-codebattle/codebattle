import React from "react";
import i18n from "../../../i18n";
import { tabBtnClass, tabBtnStyle } from "../../utils/groupTournament";

const MainPanelTabs = ({
  activeTab,
  setActiveTab,
  hasLeaderboard,
  hasTaskDescription,
  isWaiting,
  isAdmin,
  externalSetup,
}) => (
  <div className="d-flex align-items-center flex-wrap mr-3">
    {[
      "description",
      hasTaskDescription && "task_description",
      !isWaiting && "run",
      !isWaiting && hasLeaderboard && "leaderboard",
      !isWaiting && isAdmin && externalSetup && "settings",
    ]
      .filter(Boolean)
      .map((tab) => (
        <button
          key={tab}
          type="button"
          className={tabBtnClass(activeTab === tab)}
          style={tabBtnStyle(activeTab === tab)}
          onClick={() => setActiveTab(tab)}
        >
          {tab === "settings" ? (
            <>
              {i18n.t("External Setup")}
              <span
                className={`badge ml-2 ${externalSetup.state === "ready" ? "badge-success" : "badge-warning"}`}
              >
                {externalSetup.state}
              </span>
            </>
          ) : (
            i18n.t(
              {
                description: "Description",
                task_description: "Task",
                run: "Run Viewer",
                leaderboard: "Leaderboard",
              }[tab],
            )
          )}
        </button>
      ))}
  </div>
);

export default MainPanelTabs;
