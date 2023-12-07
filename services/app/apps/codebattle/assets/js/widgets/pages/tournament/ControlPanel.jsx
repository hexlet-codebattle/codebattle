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
  disabledSearch = false,
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
      {panelMode !== PanelModeCodes.playerMode && !disabledSearch ? (
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
        className={cn('d-flex mb-2 text-nowrap', {
          'text-muted': disabledPanelModeControl,
          'justify-content-end': panelMode === PanelModeCodes.playerMode,
        })}
      >
        <button
          type="button"
          className="btn btn-sm btn-outline-light border-0 text-dark rounded-lg p-2"
          onClick={togglePanelMode}
          disabled={disabledPanelModeControl}
        >
          {panelMode === PanelModeCodes.playerMode && (
            <>
              Rating Panel
              <FontAwesomeIcon icon="caret-square-right" className="ml-2" />
            </>
          )}
          {panelMode === PanelModeCodes.ratingMode && (
            <>
              <FontAwesomeIcon icon="caret-square-left" className="mr-2" />
              Player Panel
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default memo(ControlPanel);
