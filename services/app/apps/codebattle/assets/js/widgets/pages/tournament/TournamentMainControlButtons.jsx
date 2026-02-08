import React, { memo, useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Dropdown from 'react-bootstrap/Dropdown';
import { useDispatch } from 'react-redux';

import {
  cancelTournament,
  restartTournament as handleRestartTournament,
  finishRoundTournament as handleFinishRoundTournament,
  openUpTournament as handleOpenUpTournament,
  showTournamentResults as handleShowResults,
} from '../../middlewares/TournamentAdmin';

const CustomToggle = React.forwardRef(
  ({ onClick, className, disabled }, ref) => (
    <button
      type="button"
      ref={ref}
      className={className.replace('dropdown-toggle', '')}
      onClick={onClick}
      disabled={disabled}
    >
      <FontAwesomeIcon icon="ellipsis-v" />
    </button>
  ),
);

function TournamentMainControlButtons({
  accessType,
  streamMode,
  tournamentId,
  canStart,
  canStartRound,
  canFinishRound,
  canToggleShowBots,
  canRestart,
  showBots,
  hideResults,
  disabled = true,
  toggleShowBots,
  handleStartRound,
  handleOpenDetails,
  toggleStreamMode,
}) {
  const dispatch = useDispatch();

  const handleStartTournament = useCallback(() => {
    handleStartRound('firstRound');
  }, [handleStartRound]);
  const handleCancelTournament = useCallback(() => {
    dispatch(cancelTournament());
  }, [dispatch]);
  const handleStartRoundTournament = useCallback(() => {
    handleStartRound('nextRound');
  }, [handleStartRound]);

  const restartBtnClassName = cn(
    'btn text-nowrap ml-lg-2 rounded-left btn-secondary cb-btn-secondary',
  );
  const roundBtnClassName = cn(
    'btn text-nowrap ml-lg-2 rounded-left btn-success cb-btn-success text-white',
  );

  const dropdownBtnClassName = cn('btn text-white rounded-right', {
    'rounded-left': streamMode,
    'btn-secondary cb-btn-secondary': canRestart,
    'btn-success cb-btn-success text-white': !canRestart,
  });

  return (
    <>
      {!streamMode && (
        <>
          {canStartRound ? (
            <button
              type="button"
              className={roundBtnClassName}
              onClick={handleStartRoundTournament}
              disabled={!canStartRound || disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="arrow-right" />
              Start Round
            </button>
          ) : null}
          {canFinishRound ? (
            <button
              type="button"
              className={roundBtnClassName}
              onClick={handleFinishRoundTournament}
              disabled={!canFinishRound || disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="arrow-right" />
              Finish Round
            </button>
          ) : null}
          {canRestart ? (
            <button
              type="button"
              className={restartBtnClassName}
              onClick={handleRestartTournament}
              disabled={!canRestart || disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="sync" />
              Restart
            </button>
          ) : (
            <button
              type="button"
              className={roundBtnClassName}
              onClick={handleStartTournament}
              disabled={!canStart || disabled}
            >
              <FontAwesomeIcon className="mr-2" icon="play" />
              Start
            </button>
          )}
        </>
      )}
      <Dropdown title="Task actions" className="d-flex cb-dropdown">
        <Dropdown.Toggle
          as={CustomToggle}
          id="tournament-actions-dropdown-toggle"
          className={dropdownBtnClassName}
          variant={canRestart ? 'info' : 'success'}
          disabled={disabled}
        />
        <Dropdown.Menu className="cb-dropdown-menu cb-bg-highlight-panel dropdown-menu-end">
          <Dropdown.Item
            as="a"
            disabled={disabled}
            key="edit"
            href={`/tournaments/${tournamentId}/edit`}
            className="cb-dropdown-item"
          >
            <FontAwesomeIcon className="mr-2" icon="edit" />
            Edit
          </Dropdown.Item>
          <Dropdown.Item
            as="a"
            key="tournaments"
            href="/tournaments"
            className="cb-dropdown-item"
          >
            <FontAwesomeIcon className="mr-2" icon="trophy" />
            Tournaments
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled || !hideResults}
            key="showResults"
            onSelect={handleShowResults}
            className="cb-dropdown-item"
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Show Results
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled}
            key="streamMode"
            className="cb-dropdown-item"
            onSelect={toggleStreamMode}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Toggle stream mode
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled || !canToggleShowBots}
            key="showBots"
            className="cb-dropdown-item"
            onSelect={toggleShowBots}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            {showBots ? 'Hide bots' : 'Show bots'}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            key="tournamentDetails"
            className="cb-dropdown-item"
            onSelect={handleOpenDetails}
          >
            <FontAwesomeIcon className="mr-2" icon="cog" />
            Tournament details
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={disabled}
            key="cancel"
            className="cb-dropdown-item"
            onSelect={handleCancelTournament}
          >
            <FontAwesomeIcon className="mr-2" icon="trash" />
            Cancel
          </Dropdown.Item>
          {accessType === 'token' && (
            <>
              <Dropdown.Divider className="cb-border-color" />
              <Dropdown.Item
                as="button"
                disabled={disabled}
                key="openUp"
                className="cb-dropdown-item"
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
}

export default memo(TournamentMainControlButtons);
