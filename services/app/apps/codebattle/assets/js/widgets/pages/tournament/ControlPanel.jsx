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

export const PanelModeCodes = {
  ratingMode: 'ratingMode',
  playerMode: 'playerMode',
};

function ControlPanel({
  searchOption,
  panelMode,
  disabledPanelModeControl = false,
  setSearchOption,
  togglePanelMode,
}) {
  const allPlayers = useSelector(tournamentPlayersSelector);

  const onChangeSearchedPlayer = useCallback(
    ({ value }) => setSearchOption(value),
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
          isDisabled={panelMode === PanelModeCodes.playerMode}
        />
      </div>
      <div
        className={cn('d-flex custom-control custom-switch mb-2', {
          'text-muted': disabledPanelModeControl,
        })}
      >
        <input
          type="checkbox"
          className="custom-control-input"
          id="customMatchesPanelMode"
          checked={panelMode === PanelModeCodes.ratingMode}
          onChange={togglePanelMode}
          disabled={disabledPanelModeControl}
        />
        <label
          className="custom-control-label text-nowrap"
          htmlFor="customMatchesPanelMode"
        >
          <span
            className={panelMode === PanelModeCodes.playerMode ? 'text-primary' : ''}
          >
            Player Panel
          </span>
          {' / '}
          <span
            className={panelMode === PanelModeCodes.ratingMode ? 'text-primary' : ''}
          >
            Rating Panel
          </span>
        </label>
      </div>
    </div>
  );
}

export default memo(ControlPanel);
