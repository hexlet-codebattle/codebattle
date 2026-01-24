import React, { memo, useCallback, useContext } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import { tournamentPlayersSelector } from '../../selectors';

// %{"type" => "top_users_by_clan_ranking"} ->
// %{"type" => "tasks_ranking"} ->
// %{"type" => "task_duration_distribution", "task_id" => task_id} ->
// %{"type" => "clans_bubble_distribution"} ->
// %{"type" => "top_user_by_task_ranking", "task_id" => task_id} ->
//
export const PanelModeCodes = {
  ratingMode: 'ratingMode',
  reportsMode: 'reportsMode',
  leaderboardMode: 'leaderboardMode',
  playerMode: 'playerMode',
  topUserByClansMode: 'top_users_by_clan_ranking',
  taskRatingMode: 'tasks_ranking',
  clansBubbleDistributionMode: 'clans_bubble_distribution',
  taskRatingAdvanced: 'task_rating_advanced',
  taskDurationDistributionMode: 'task_duration_distribution',
  topUserByTasksMode: 'top_user_by_task_ranking',
};

export const mapPanelModeToTitle = {
  [PanelModeCodes.ratingMode]: i18next.t('Players & Matches'),
  [PanelModeCodes.reportsMode]: i18next.t('Reports Panel'),
  [PanelModeCodes.playerMode]: i18next.t('Player Panel'),
  [PanelModeCodes.leaderboardMode]: i18next.t('Leaderboard'),
  [PanelModeCodes.topUserByClansMode]: i18next.t('Top users by clan ranking'),
  [PanelModeCodes.taskRatingMode]: i18next.t('Tasks ranking'),
  [PanelModeCodes.clansBubbleDistributionMode]: i18next.t(
    'Clans bubble distribution',
  ),
  [PanelModeCodes.taskRatingAdvanced]: i18next.t(
    'Duration distribution and top users by task',
  ),
  [PanelModeCodes.taskDurationDistributionMode]: i18next.t(
    'task duration distribution',
  ),
  [PanelModeCodes.topUserByTasksMode]: i18next.t('Top user by task ranking'),
};

function ControlPanel({
  allowedPanelModes,
  isPlayer,
  panelMode,
  panelHistory,
  setPanelHistory,
  setSearchOption,
  setPanelMode,
}) {
  const allPlayers = useSelector(tournamentPlayersSelector);
  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const onPanelBack = useCallback(() => {
    if (panelHistory.length === 0) return;

    const [prev, ...rest] = panelHistory.reverse();

    setPanelMode(prev);
    setPanelHistory(rest.reverse());

    if (prev.userId) {
      setSearchOption(allPlayers[prev.userId]);
    }
  }, [
    panelHistory,
    setPanelHistory,
    setPanelMode,
    setSearchOption,
    allPlayers,
  ]);
  const onChangePanelMode = useCallback(
    (e) => {
      setPanelMode({ panel: e.target.value });
      setPanelHistory((items) => [...items, panelMode]);
    },
    [setPanelMode, setPanelHistory, panelMode],
  );
  const backBtnClassName = cn('btn text-nowrap cb-rounded mr-1 mb-2', {
    'btn-outline-secondary cb-btn-outline-secondary': !hasCustomEventStyles,
    'cb-custom-event-btn-outline-secondary': hasCustomEventStyles,
  });

  return (
    <div className="d-flex flex-column flex-md-row flex-lg-row flex-xl-row justify-content-between">
      <div className="d-flex align-items-center w-50">
        <button
          type="button"
          className={backBtnClassName}
          onClick={onPanelBack}
          disabled={panelHistory.length === 0}
        >
          <FontAwesomeIcon icon="backward" className="mr-1" />
          {i18next.t('Back')}
        </button>
        <div />
      </div>
      <div className={cn('d-flex mb-2 text-nowrap justify-content-end')}>
        <select
          key="select_panel_mode"
          className="form-control custom-select cb-bg-panel cb-border-color text-white cb-rounded"
          value={panelMode.panel}
          onChange={onChangePanelMode}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath "
              + "fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' "
              + "stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '16px 12px',
            paddingRight: '2.25rem',
          }}
        >
          {allowedPanelModes.map(
            (mode) => (![
                PanelModeCodes.taskRatingAdvanced,
                PanelModeCodes.taskDurationDistributionMode,
                PanelModeCodes.topUserByTasksMode,
              ].includes(mode)
                || mode === panelMode.panel) && (
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
