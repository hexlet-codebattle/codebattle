import React from "react";
import i18n from "../../../i18n";
import { tabBtnClass, tabBtnStyle, roundLabel } from "../../utils/groupTournament";

const LeaderboardTabs = ({ activeTab, setActiveTab, rounds }) => (
  <div className="d-flex flex-wrap px-3 pt-2">
    <button
      type="button"
      className={tabBtnClass(activeTab === "rating")}
      style={tabBtnStyle(activeTab === "rating")}
      onClick={() => setActiveTab("rating")}
    >
      {i18n.t("Leaderboard")}
    </button>
    {rounds.map((r) => (
      <button
        key={`tab-${r}`}
        type="button"
        className={tabBtnClass(activeTab === `round-${r}`)}
        style={tabBtnStyle(activeTab === `round-${r}`)}
        onClick={() => setActiveTab(`round-${r}`)}
      >
        {roundLabel(r)}
      </button>
    ))}
  </div>
);

export default LeaderboardTabs;
