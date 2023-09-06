import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Dropdown from 'react-bootstrap/Dropdown';

import {
  cancelTournament as handleCancelTournament,
  startTournament as handleStartTournament,
  restartTournament as handleRestartTournament,
  openUpTournament as handleOpenUpTournament,
} from '../../middlewares/Tournament';

const CustomToggle = React.forwardRef(({ onClick, disabled }, ref) => (
  <button
    type="button"
    ref={ref}
    className="btn btn-success text-white rounded-right"
    onClick={onClick}
    disabled={disabled}
  >
    <FontAwesomeIcon icon="ellipsis-v" />
  </button>
));

const TournamentMainControlButtons = ({
  accessType,
  tournamentId,
  canStart,
  disabled = true,
}) => (
  <>
    <button
      type="button"
      className="btn btn-success text-white text-nowrap ml-2 rounded-left"
      onClick={handleStartTournament}
      disabled={!canStart || disabled}
    >
      <FontAwesomeIcon className="mr-2" icon="play" />
      Start
    </button>
    <Dropdown
      title="Task actions"
      className="d-flex"
    >
      <Dropdown.Toggle
        as={CustomToggle}
        id="tournament-actions-dropdown-toggle"
        disabled={disabled}
      />
      <Dropdown.Menu>
        <Dropdown.Item disabled={disabled} key="edit" href={`/tournaments/${tournamentId}/edit`}>
          <FontAwesomeIcon className="mr-2" icon="edit" />
          Edit
        </Dropdown.Item>
        <Dropdown.Item disabled={disabled} key="restart" onSelect={handleRestartTournament}>
          <FontAwesomeIcon className="mr-2" icon="sync" />
          Restart
        </Dropdown.Item>
        <Dropdown.Item disabled={disabled} key="cancel" onSelect={handleCancelTournament}>
          <FontAwesomeIcon className="mr-2" icon="trash" />
          Cancel
        </Dropdown.Item>
        {accessType === 'token' && (
          <>
            <Dropdown.Divider />
            <Dropdown.Item disabled={disabled} key="openUp" onSelect={handleOpenUpTournament}>
              <FontAwesomeIcon className="mr-2" icon="unlock" />
              Open up
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  </>
);

export default memo(TournamentMainControlButtons);
