import React, { memo, useCallback, useContext } from "react";

import cn from "classnames";
import i18next from "i18next";

import CustomEventStylesContext from "../../components/CustomEventStylesContext";

// %{"type" => "top_users_by_clan_ranking"} ->
// %{"type" => "tasks_ranking"} ->
// %{"type" => "task_duration_distribution", "task_id" => task_id} ->
// %{"type" => "clans_bubble_distribution"} ->
// %{"type" => "top_user_by_task_ranking", "task_id" => task_id} ->
//
export const PanelModeCodes = {
  ratingMode: "ratingMode",
  reportsMode: "reportsMode",
  cheatersMode: "cheatersMode",
  leaderboardMode: "leaderboardMode",
  playerMode: "playerMode",
  topUserByClansMode: "top_users_by_clan_ranking",
  taskRatingMode: "tasks_ranking",
  clansBubbleDistributionMode: "clans_bubble_distribution",
  taskRatingAdvanced: "task_rating_advanced",
  taskDurationDistributionMode: "task_duration_distribution",
  topUserByTasksMode: "top_user_by_task_ranking",
};

export const mapPanelModeToTitle = {
  [PanelModeCodes.ratingMode]: i18next.t("Players & Matches"),
  [PanelModeCodes.reportsMode]: i18next.t("Reports Panel"),
  [PanelModeCodes.cheatersMode]: i18next.t("Cheaters Panel"),
  [PanelModeCodes.playerMode]: i18next.t("Player Panel"),
  [PanelModeCodes.leaderboardMode]: i18next.t("Leaderboard"),
  [PanelModeCodes.topUserByClansMode]: i18next.t("Top users by clan ranking"),
  [PanelModeCodes.taskRatingMode]: i18next.t("Tasks ranking"),
  [PanelModeCodes.clansBubbleDistributionMode]: i18next.t("Clans bubble distribution"),
  [PanelModeCodes.taskRatingAdvanced]: i18next.t("Duration distribution and top users by task"),
  [PanelModeCodes.taskDurationDistributionMode]: i18next.t("task duration distribution"),
  [PanelModeCodes.topUserByTasksMode]: i18next.t("Top user by task ranking"),
};

function ControlPanel({
  allowedPanelModes,
  isPlayer,
  leftContent = null,
  panelMode,
  setPanelMode,
}) {
  const hasCustomEventStyles = useContext(CustomEventStylesContext);
  const onChangePanelMode = useCallback(
    (e) => {
      setPanelMode({ panel: e.target.value });
    },
    [setPanelMode],
  );

  return (
    <div className="d-flex flex-column flex-md-row flex-lg-row flex-xl-row justify-content-between align-items-start gap-2">
      <div className="d-flex align-items-start flex-grow-1 min-w-0 mb-2 mb-md-0">{leftContent}</div>
      <div
        className={cn(
          "d-flex text-nowrap justify-content-end ml-md-3",
          hasCustomEventStyles && "cb-custom-event-text",
        )}
      >
        <select
          key="select_panel_mode"
          className="form-control custom-select cb-bg-panel cb-border-color text-white cb-rounded"
          value={panelMode.panel}
          onChange={onChangePanelMode}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath " +
              "fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' " +
              "stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.75rem center",
            backgroundSize: "16px 12px",
            paddingRight: "2.25rem",
          }}
        >
          {allowedPanelModes.map(
            (mode) =>
              (![
                PanelModeCodes.taskRatingAdvanced,
                PanelModeCodes.taskDurationDistributionMode,
                PanelModeCodes.topUserByTasksMode,
              ].includes(mode) ||
                mode === panelMode.panel) && (
                <option
                  key={mode}
                  value={mode}
                  className="cb-bg-panel text-white"
                  disabled={mode === PanelModeCodes.playerMode && !isPlayer}
                >
                  {mapPanelModeToTitle[mode]}
                </option>
              ),
          )}
        </select>
      </div>
    </div>
  );
}

export default memo(ControlPanel);
