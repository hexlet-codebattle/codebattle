import React from "react";
import Markdown from "react-markdown";
import i18n from "../../../i18n";

const MainPanelDescription = ({ description }) => (
  <div className="mt-3 p-3 w-100 overflow-auto cb-group-tournament-leaderboard-container">
    {description ? (
      <div className="cb-markdown text-white mb-0">
        <Markdown>{description}</Markdown>
      </div>
    ) : (
      <div className="small text-white-50">
        {i18n.t("No description provided for this tournament.")}
      </div>
    )}
  </div>
);

export default MainPanelDescription;
