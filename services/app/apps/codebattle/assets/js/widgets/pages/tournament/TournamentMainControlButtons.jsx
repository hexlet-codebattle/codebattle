import React, { memo, useCallback, useContext } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Dropdown from 'react-bootstrap/Dropdown';
import { useDispatch } from 'react-redux';

import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import {
  cancelTournament,
  restartTournament as handleRestartTournament,
  finishRoundTournament as handleFinishRoundTournament,
  openUpTournament as handleOpenUpTournament,
  showTournamentResults as handleShowResults,
} from '../../middlewares/TournamentAdmin';

const CustomToggle = React.forwardRef(({ onClick, className, disabled }, ref) => (
  <button
    type="button"
    ref={ref}
    className={className.replace('dropdown-toggle', '')}
    onClick={onClick}
    disabled={disabled}
  >
    <FontAwesomeIcon icon="ellipsis-v" />
  </button>
));

const TournamentMainControlButtons = ({
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
}) => {
  const dispatch = useDispatch();

  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const handleStartTournament = useCallback(() => {
    handleStartRound('firstRound');
  }, [handleStartRound]);
  const handleCancelTournament = useCallback(() => {
    dispatch(cancelTournament());
  }, [dispatch]);
  const handleStartRoundTournament = useCallback(() => {
    handleStartRound('nextRound');
  }, [handleStartRound]);

  const restartBtnClassName = cn('btn text-white text-nowrap ml-lg-2 rounded-left', {
    'btn-info': !hasCustomEventStyles,
    'cb-custom-event-btn-info': hasCustomEventStyles,
  });
  const roundBtnClassName = cn('btn text-white text-nowrap ml-lg-2 rounded-left', {
    'btn-success': !hasCustomEventStyles,
    'cb-custom-event-btn-success': hasCustomEventStyles,
  });

  const dropdownBtnClassName = cn('btn text-white rounded-right', {
    'rounded-left': streamMode,
    'btn-info': !hasCustomEventStyles && canRestart,
    'btn-success': !hasCustomEventStyles && !canRestart,
    'cb-custom-event-btn-info': hasCustomEventStyles && canRestart,
    'cb-custom-event-btn-success': hasCustomEventStyles && !canRestart,
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
      <Dropdown title="Task actions" className="d-flex">
        <Dropdown.Toggle
          as={CustomToggle}
          id="tournament-actions-dropdown-toggle"
          className={dropdownBtnClassName}
          variant={canRestart ? 'info' : 'success'}
          disabled={disabled}
        />
        <Dropdown.Menu className="dropdown-menu-end">
          <Dropdown.Item
            disabled={disabled}
            key="edit"
            href={`/live_view_tournaments/${tournamentId}/edit`}
          >
            <FontAwesomeIcon className="mr-2" icon="edit" />
            Edit
          </Dropdown.Item>
          <Dropdown.Item key="tournaments" href="/tournaments">
            <FontAwesomeIcon className="mr-2" icon="trophy" />
            Tournaments
          </Dropdown.Item>
          <Dropdown.Item
            disabled={disabled || !hideResults}
            key="showResults"
            onSelect={handleShowResults}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Show Results
          </Dropdown.Item>
          <Dropdown.Item
            disabled={disabled}
            key="streamMode"
            onSelect={toggleStreamMode}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            Toggle stream mode
          </Dropdown.Item>
          <Dropdown.Item
            disabled={disabled || !canToggleShowBots}
            key="showResults"
            onSelect={toggleShowBots}
          >
            <FontAwesomeIcon className="mr-2" icon="eye" />
            {showBots ? 'Hide bots' : 'Show bots'}
          </Dropdown.Item>
          <Dropdown.Item
            key="tournamentDetails"
            onSelect={handleOpenDetails}
          >
            <FontAwesomeIcon className="mr-2" icon="cog" />
            Tournament details
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
};

export default memo(TournamentMainControlButtons);
