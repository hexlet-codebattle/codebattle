import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Dropdown from 'react-bootstrap/Dropdown';

import {
  cancelTournament as handleCancelTournament,
  startTournament as handleStartTournament,
  restartTournament as handleRestartTournament,
  startRoundTournament as handleStartRoundTournament,
  openUpTournament as handleOpenUpTournament,
} from '../../middlewares/Tournament';

const CustomToggle = React.forwardRef(({ onClick, variant, disabled }, ref) => (
  <button
    type="button"
    ref={ref}
    className={`btn btn-${variant} text-white rounded-right`}
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
  canStartRound,
  canRestart,
  disabled = true,
}) => (
  <>
    {canStartRound ? (
      <button
        type="button"
        className="btn btn-success text-white text-nowrap ml-lg-2 rounded-left"
        onClick={handleStartRoundTournament}
        disabled={!canStartRound || disabled}
      >
        <FontAwesomeIcon className="ml-2" icon="arrow-right" />
        Start Round
      </button>
    ) : null}
    {canRestart ? (
      <button
        type="button"
        className="btn btn-info text-white text-nowrap ml-lg-2 rounded-left"
        onClick={handleRestartTournament}
        disabled={!canRestart || disabled}
      >
        <FontAwesomeIcon className="mr-2" icon="sync" />
        Restart
      </button>
    ) : (
      <button
        type="button"
        className="btn btn-success text-white text-nowrap ml-lg-2 rounded-left"
        onClick={handleStartTournament}
        disabled={!canStart || disabled}
      >
        <FontAwesomeIcon className="mr-2" icon="play" />
        Start
      </button>
    )}
    <Dropdown title="Task actions" className="d-flex">
      <Dropdown.Toggle
        as={CustomToggle}
        id="tournament-actions-dropdown-toggle"
        variant={canRestart ? 'info' : 'success'}
        disabled={disabled}
      />
      <Dropdown.Menu>
        <Dropdown.Item
          disabled={disabled}
          key="edit"
          href={`/live_view_tournaments/${tournamentId}/edit`}
        >
          <FontAwesomeIcon className="mr-2" icon="edit" />
          Edit
        </Dropdown.Item>
        <Dropdown.Item
          key="tournaments"
          href="/tournaments"
        >
          <FontAwesomeIcon className="mr-2" icon="trophy" />
          Tournaments
        </Dropdown.Item>
        <Dropdown.Item
          disabled={disabled}
          key="cancel"
          onSelect={handleCancelTournament}
        >
          <FontAwesomeIcon className="mr-2" icon="trash" />
          Cancel
        </Dropdown.Item>
        {accessType === 'token' && (
          <>
            <Dropdown.Divider />
            <Dropdown.Item
              disabled={disabled}
              key="openUp"
              onSelect={handleOpenUpTournament}
            >
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
