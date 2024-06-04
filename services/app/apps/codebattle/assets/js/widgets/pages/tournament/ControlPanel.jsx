import React, {
 memo, useCallback,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';

import UserLabel from '../../components/UserLabel';
import {
  tournamentPlayersSelector,
} from '../../selectors';

        // %{"type" => "top_users_by_clan_ranking"} ->
        // %{"type" => "tasks_ranking"} ->
        // %{"type" => "task_duration_distribution", "task_id" => task_id} ->
        // %{"type" => "clans_bubble_distribution"} ->
        // %{"type" => "top_user_by_task_ranking", "task_id" => task_id} ->
//
export const PanelModeCodes = {
  ratingMode: 'ratingMode',
  playerMode: 'playerMode',
  topUserByClansMode: 'top_users_by_clan_ranking',
  taskRatingMode: 'tasks_ranking',
  clansBubbleDistributionMode: 'clans_bubble_distribution',
  taskRatingAdvanced: 'task_rating_advanced',
  taskDurationDistributionMode: 'task_duration_distribution',
  topUserByTasksMode: 'top_user_by_task_ranking',
};

export const mapPanelModeToTitle = {
  [PanelModeCodes.ratingMode]: 'Rating Panel',
  [PanelModeCodes.playerMode]: 'Player Panel',
  [PanelModeCodes.topUserByClansMode]: 'Top users by clan ranking',
  [PanelModeCodes.taskRatingMode]: 'Tasks ranking',
  [PanelModeCodes.clansBubbleDistributionMode]: 'Clans bubble distribution',
  [PanelModeCodes.taskDurationDistributionMode]: 'task duration distribution',
  [PanelModeCodes.topUserByTasksMode]: 'Top user by task ranking',
};

function ControlPanel({
  searchOption,
  panelMode,
  disabledPanelModeControl = false,
  disabledSearch = false,
  setSearchOption,
  setPanelMode,
}) {
  const allPlayers = useSelector(tournamentPlayersSelector);

  const onChangePanelMode = useCallback(e => {
    setPanelMode(e.target.value);
  }, [setPanelMode]);
  const onChangeSearchedPlayer = useCallback(
    ({ value = '' }) => setSearchOption(value),
    [setSearchOption],
  );
  const loadOptions = useCallback(
    (inputValue, callback) => {
      const substr = inputValue.toLowerCase();

      const options = Object.values(allPlayers)
        .filter(player => player.name.toLowerCase().indexOf(substr) !== -1)
        .map(player => ({
          label: <UserLabel user={player} />,
          value: player,
        }));

      callback(options);
    },
    [allPlayers],
  );

  return (
    <div className="d-flex flex-column flex-md-row flex-lg-row flex-xl-row justify-content-between">
      {panelMode === PanelModeCodes.ratingMode && !disabledSearch ? (
        <div className="input-group flex-nowrap mb-2">
          <div className="input-group-prepend">
            <span className="input-group-text" id="search-icon">
              <FontAwesomeIcon icon="search" />
            </span>
          </div>
          <AsyncSelect
            value={
              searchOption && {
                label: <UserLabel user={searchOption} />,
                value: searchOption,
              }
            }
            defaultOptions
            classNamePrefix="rounded-0 "
            onChange={onChangeSearchedPlayer}
            loadOptions={loadOptions}
          />
        </div>
      ) : <div />}
      <div
        className={cn('d-flex mb-2 text-nowrap justify-content-end', {
          'text-muted': disabledPanelModeControl,
        })}
      >
        <select
          key="select_panel_mode"
          className="form-control custom-select rounded-lg"
          value={panelMode}
          onChange={onChangePanelMode}
          disabled={disabledPanelModeControl}
        >
          {Object.values(PanelModeCodes).map(mode => (
            (![
              PanelModeCodes.taskRatingAdvanced,
              PanelModeCodes.taskDurationDistributionMode,
              PanelModeCodes.topUserByTasksMode,
            ].includes(mode) || mode === panelMode) && (
            <option
              key={mode}
              value={mode}
            >
              {mapPanelModeToTitle[mode]}
            </option>
          )))}
        </select>
      </div>
    </div>
  );
}

export default memo(ControlPanel);
