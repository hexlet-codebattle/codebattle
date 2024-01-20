import React, {
 memo, useState, useCallback, useEffect, useMemo,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

import { tournamentEmptyPlayerUrl } from '../../utils/urlBuilders';

import ControlPanel, { PanelModeCodes } from './ControlPanel';
import PlayerStatsPanel from './PlayerStatsPanel';
import RatingPanel from './RatingPanel';

const emptyPlayer = {};

const TournamentGameCreatePanel = ({
  selectedPlayer,
  selectedTaskLevel,
  players,
  onSelectPlayer,
  onSelectTaskLevel,
  onEditTaskLevel,
  onClose,
  disabled,
}) => (
  <div className="d-flex justify-content-between w-100 flex-row border rounded-lg p-3 mb-2">
    {!selectedPlayer && (
      <>
        <img
          alt="Waiting opponent avatar"
          src={tournamentEmptyPlayerUrl}
          className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar bg-gray rounded p-3"
        />
        <div className="d-flex justify-content-between align-items-center flex-column">
          <select
            className="form-control custom-select rounded-lg m-1"
            onChange={e => onSelectPlayer(players[e.target.value])}
          >
            <option disabled selected value>Choose player</option>
            {
              Object.values(players)
                .filter(player => !player.isBot)
                .map(player => (
                  <option
                    key={player.id}
                    value={player.id}
                  >
                    {player.name}
                  </option>
                ))
            }
          </select>
        </div>
      </>
    )}
    {selectedPlayer && !selectedTaskLevel && (
      <>
        <div className="d-flex align-items-baseline flex-nowrap">
          <span className="h5 text-nowrap">{`Choose task level for player ${selectedPlayer.name}: `}</span>
          <div className="d-flex justify-content-begin flex-column flex-sm-row w-100 button-group">
            <button
              type="button"
              className="btn btn-sm btn-secondary py-1 mx-1 rounded-lg"
              onClick={() => onSelectTaskLevel('easy')}
            >
              Easy
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning py-1 mx-1 rounded-lg"
              onClick={() => onSelectTaskLevel('medium')}
            >
              Medium
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger py-1 mx-1 rounded-lg"
              onClick={() => onSelectTaskLevel('hard')}
            >
              Hard
            </button>
          </div>
        </div>
        <div>
          <button className="btn btn-sm" type="button" onClick={onClose}>
            <FontAwesomeIcon icon="times" />
          </button>
        </div>
      </>
    )}
    {selectedPlayer && selectedTaskLevel && (
      <>
        <div className="d-flex w-100">
          <img
            alt={`${selectedPlayer.name} avatar`}
            src={selectedPlayer.avatarUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar rounded p-2"
          />
          <div className="d-flex flex-column justify-content-center">
            <span className="h6 p-1 text-nowrap">{`Player: ${selectedPlayer.name}`}</span>
            <div className="d-flex align-items-baseline p-1">
              <span
                className="h6 text-nowrap"
              >
                {`Level: ${selectedTaskLevel}`}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={onEditTaskLevel}
              >
                <FontAwesomeIcon icon="pen" />
              </button>
            </div>
            {disabled ? (
              <button
                type="button"
                className="btn btn-sm btn-secondary rounded-lg p-1 px-2"
                disabled
              >
                Match already started
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-secondary rounded-lg p-1"
              >
                <FontAwesomeIcon className="mr-2" icon="play" />
                Start match
              </button>
            )}
          </div>
        </div>
        <div>
          <button className="btn btn-sm" type="button" onClick={onClose}>
            <FontAwesomeIcon icon="times" />
          </button>
        </div>
      </>
    )}
  </div>
);

function CustomTournamentInfoPanel({
  roundsLimit = 1,
  currentRoundPosition = 0,
  matches,
  players,
  topPlayerIds,
  currentUserId,
  pageNumber,
  pageSize,
  hideResults = false,
  hideCustomGameConsole = false,
  isAdmin = false,
  isOwner = false,
}) {
  const [choosenPlayer, setChoosenPlayer] = useState(emptyPlayer);
  const [choosenTaskLevel, setChoosenTaskLevel] = useState();
  const [searchedUser, setSearchedUser] = useState();
  const [panelMode, setPanelMode] = useState(
    players[currentUserId]
      ? PanelModeCodes.playerMode
      : PanelModeCodes.ratingMode,
  );

  const togglePanelMode = useCallback(() => {
    setPanelMode(mode => (mode === PanelModeCodes.playerMode
        ? PanelModeCodes.ratingMode
        : PanelModeCodes.playerMode));
  }, [setPanelMode]);
  const clearChoosenUser = useCallback(() => {
    setChoosenPlayer();
    setChoosenTaskLevel();
  }, [setChoosenPlayer, setChoosenTaskLevel]);
  const clearChoosenTaskLevel = useCallback(() => {
    setChoosenTaskLevel();
  }, [setChoosenTaskLevel]);
  const alreadyHaveActiveMatch = useMemo(() => {
    if (!choosenPlayer) return false;

    const activeMatches = Object.values(matches)
      .filter(match => (
        match.roundPosition === currentRoundPosition
          && match.playerIds.includes(choosenPlayer.id)
          && match.state === 'playing'
      ));

    console.log(activeMatches, matches);

    return activeMatches.length !== 0;
  }, [choosenPlayer, matches, currentRoundPosition]);

  useEffect(() => {
    if (choosenPlayer === emptyPlayer && !hideCustomGameConsole) {
      const playersListWithoutBots = Object.values(players)
          .filter(player => !player.isBot);

      if (playersListWithoutBots.length === 1) {
        setChoosenPlayer(playersListWithoutBots[0]);
      }
    }
  }, [players, choosenPlayer, hideCustomGameConsole]);

  return (
    <>
      <SwitchTransition mode="out-in">
        <CSSTransition
          key={panelMode}
          addEndListener={(node, done) => {
            node.addEventListener('transitionend', done, false);
          }}
          classNames={`tournament-info-${panelMode}`}
        >
          <div>
            <ControlPanel
              searchOption={searchedUser}
              panelMode={panelMode}
              setSearchOption={setSearchedUser}
              togglePanelMode={togglePanelMode}
              disabledPanelModeControl={
                !players[currentUserId] || (hideResults && !isAdmin && !isOwner)
              }
              disabledSearch={!isAdmin && !isOwner}
            />
            {!hideCustomGameConsole && (
              <TournamentGameCreatePanel
                selectedPlayer={choosenPlayer}
                selectedTaskLevel={choosenTaskLevel}
                players={players}
                matches={matches}
                onSelectPlayer={setChoosenPlayer}
                onSelectTaskLevel={setChoosenTaskLevel}
                onEditTaskLevel={clearChoosenTaskLevel}
                onClose={clearChoosenUser}
                disabled={alreadyHaveActiveMatch}
              />
            )}
            {panelMode === PanelModeCodes.playerMode && (
              <PlayerStatsPanel
                currentRoundPosition={currentRoundPosition}
                roundsLimit={roundsLimit}
                matches={matches}
                players={players}
                currentUserId={currentUserId}
              />
            )}
            {panelMode === PanelModeCodes.ratingMode && (
              <RatingPanel
                searchedUser={searchedUser}
                roundsLimit={roundsLimit}
                currentRoundPosition={currentRoundPosition}
                matches={matches}
                players={players}
                topPlayerIds={topPlayerIds}
                currentUserId={currentUserId}
                pageNumber={pageNumber}
                pageSize={pageSize}
                hideResults={hideResults && !isAdmin && !isOwner}
              />
            )}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </>
  );
}

export default memo(CustomTournamentInfoPanel);
