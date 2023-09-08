import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Dropdown from 'react-bootstrap/Dropdown';

import {
  cancelTournament as handleCancelTournament,
  startTournament as handleStartTournament,
  restartTournament as handleRestartTournament,
  openUpTournament as handleOpenUpTournament,
} from '../../middlewares/Tournament';

const CustomToggle = React.forwardRef(({ disabled, onClick }, ref) => (
  <button
    ref={ref}
    className="btn btn-success text-white rounded-right"
    disabled={disabled}
    type="button"
    onClick={onClick}
  >
    <FontAwesomeIcon icon="ellipsis-v" />
  </button>
));

function TournamentMainControlButtons({ accessType, canStart, disabled = true, tournamentId }) {
  return (
    <>
      <button
        className="btn btn-success text-white text-nowrap ml-2 rounded-left"
        disabled={!canStart || disabled}
        type="button"
        onClick={handleStartTournament}
      >
        <FontAwesomeIcon className="mr-2" icon="play" />
        Start
      </button>
      <Dropdown className="d-flex" title="Task actions">
        <Dropdown.Toggle
          as={CustomToggle}
          disabled={disabled}
          id="tournament-actions-dropdown-toggle"
        />
        <Dropdown.Menu>
          <Dropdown.Item key="edit" disabled={disabled} href={`/tournaments/${tournamentId}/edit`}>
            <FontAwesomeIcon className="mr-2" icon="edit" />
            Edit
          </Dropdown.Item>
          <Dropdown.Item key="restart" disabled={disabled} onSelect={handleRestartTournament}>
            <FontAwesomeIcon className="mr-2" icon="sync" />
            Restart
          </Dropdown.Item>
          <Dropdown.Item key="cancel" disabled={disabled} onSelect={handleCancelTournament}>
            <FontAwesomeIcon className="mr-2" icon="trash" />
            Cancel
          </Dropdown.Item>
          {accessType === 'token' && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item key="openUp" disabled={disabled} onSelect={handleOpenUpTournament}>
                <FontAwesomeIcon className="mr-2" icon="unlock" />
                Open up
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    </>
  );
}

export default memo(TournamentMainControlButtons);
