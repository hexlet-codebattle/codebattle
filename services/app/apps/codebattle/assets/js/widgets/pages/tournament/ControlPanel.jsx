import React, {
  memo, useCallback, useContext,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
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
  reportsMode: 'reportsMode',
  playerMode: 'playerMode',
  topUserByClansMode: 'top_users_by_clan_ranking',
  taskRatingMode: 'tasks_ranking',
  clansBubbleDistributionMode: 'clans_bubble_distribution',
  taskRatingAdvanced: 'task_rating_advanced',
  taskDurationDistributionMode: 'task_duration_distribution',
  topUserByTasksMode: 'top_user_by_task_ranking',
};

export const mapPanelModeToTitle = {
  [PanelModeCodes.ratingMode]: i18next.t('Rating Panel'),
  [PanelModeCodes.reportsMode]: i18next.t('Reports Panel'),
  [PanelModeCodes.playerMode]: i18next.t('Player Panel'),
  [PanelModeCodes.topUserByClansMode]: i18next.t('Top users by clan ranking'),
  [PanelModeCodes.taskRatingMode]: i18next.t('Tasks ranking'),
  [PanelModeCodes.clansBubbleDistributionMode]: i18next.t('Clans bubble distribution'),
  [PanelModeCodes.taskRatingAdvanced]: i18next.t('Duration distribution and top users by task'),
  [PanelModeCodes.taskDurationDistributionMode]: i18next.t('task duration distribution'),
  [PanelModeCodes.topUserByTasksMode]: i18next.t('Top user by task ranking'),
};

const customStyle = {
  control: provided => ({
    ...provided,
    color: 'white',
    borderRadius: '0.3rem',
    backgroundColor: '#2a2a35',
    borderColor: '#3a3f50',

    ':hover': {
      borderColor: '#4c4c5a',
    },
  }),
  indicatorsContainer: provided => ({
    ...provided,
  }),
  indicatorSeparator: provided => ({
    ...provided,
    backgroundColor: '#999',
  }),
  clearIndicator: provided => ({
    ...provided,
  }),
  dropdownIndicator: provided => ({
    ...provided,
    color: '#999',
  }),
  input: provided => ({
    ...provided,
  }),
  menu: provided => ({
    ...provided,
    backgroundColor: '#2a2a35',
  }),
  option: provided => ({
    ...provided,
    backgroundColor: '#2a2a35',
    ':hover': {
      backgroundColor: '#3a3f50',
    },
    ':focus': {
      backgroundColor: '#3a3f50',
    },
    ':active': {
      backgroundColor: '#3a3f50',
    },
  }),
};

function ControlPanel({
  isPlayer,
  searchOption,
  panelMode,
  panelHistory,
  disabledPanelModeControl = false,
  disabledSearch = false,
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
  }, [panelHistory, setPanelHistory, setPanelMode, setSearchOption, allPlayers]);
  const onChangePanelMode = useCallback(e => {
    setPanelMode({ panel: e.target.value });
    setPanelHistory(items => [...items, panelMode]);
  }, [setPanelMode, setPanelHistory, panelMode]);
  const onChangeSearchedPlayer = useCallback(
    ({ value = {} }) => setSearchOption(value),
    [setSearchOption],
  );
  const loadOptions = useCallback(
    (inputValue, callback) => {
      const substr = (inputValue || '').toLowerCase();

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
        {panelMode.panel === PanelModeCodes.ratingMode && !disabledSearch ? (
          <div className="input-group cb-bg-panel flex-nowrap mb-2">
            <div className="input-group-prepend">
              <span className="input-group-text cb-bg-highlight-panel cb-border-color cb-text" id="search-icon">
                <FontAwesomeIcon icon="search" />
              </span>
            </div>
            <AsyncSelect
              styles={customStyle}
              value={
                searchOption && {
                  label: <UserLabel user={searchOption} />,
                  value: searchOption,
                }
              }
              defaultOptions
              className="w-50"
              classNamePrefix="rounded-0 "
              onChange={onChangeSearchedPlayer}
              loadOptions={loadOptions}
            />
          </div>
        ) : <div />}
      </div>
      <div
        className={cn('d-flex mb-2 text-nowrap justify-content-end', {
          'text-muted': disabledPanelModeControl,
        })}
      >
        <select
          key="select_panel_mode"
          className="form-control custom-select cb-bg-panel cb-border-color text-white cb-rounded"
          value={panelMode.panel}
          onChange={onChangePanelMode}
          disabled={disabledPanelModeControl}
        >
          {Object.values(PanelModeCodes).map(mode => (
            (![
              PanelModeCodes.taskRatingAdvanced,
              PanelModeCodes.taskDurationDistributionMode,
              PanelModeCodes.topUserByTasksMode,
            ].includes(mode) || mode === panelMode.panel) && (
              <option
                key={mode}
                value={mode}
                className="cb-bg-panel text-white"
                disabled={mode === PanelModeCodes.playerMode && !isPlayer}
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
