import React, {
 memo, useMemo, useState, useEffect, useCallback,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import range from 'lodash/range';
import reverse from 'lodash/reverse';
import { useDispatch, useSelector } from 'react-redux';
import AsyncSelect from 'react-select/async';

import UserLabel from '../../components/UserLabel';
import { uploadPlayersMatches } from '../../middlewares/Tournament';
import {
  currentUserIsAdminSelector,
  tournamentSelector,
} from '../../selectors';
import { actions } from '../../slices';
import useSubscribeTournamentPlayers from '../../utils/useSubscribeTournamentPlayers';

import TournamentPlayersPagination from './TournamentPlayersPagination';
import TournamentUserPanel from './TournamentUserPanel';

const navTabsClassName = cn(
  'nav nav-tabs flex-nowrap text-center border-0',
  'text-uppercase font-weight-bold pb-2',
  'cb-overflow-x-auto cb-overflow-y-hidden',
);

const tabLinkClassName = (active, isCurrent) => cn(
    'nav-item nav-link text-uppercase text-nowrap rounded-0 font-weight-bold p-3 border-0 w-100', {
      active,
      'text-primary': isCurrent,
    },
  );

const tabContentClassName = active => cn('tab-pane fade', {
    'd-flex flex-column show active': active,
  });

const PlayersFilterPanel = memo(({ option, setOption }) => {
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const allPlayers = useSelector(tournamentSelector).players;

  const onChangeSearchedPlayer = useCallback(
    ({ value }) => setOption(value),
    [setOption],
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

  if (isAdmin) {
    return <></>;
  }

  return (
    <div className="mb-2 input-group flex-nowrap">
      <div className="input-group-prepend">
        <span className="input-group-text" id="search-icon">
          <FontAwesomeIcon icon="search" />
        </span>
      </div>
      <AsyncSelect
        value={
          option && {
            label: <UserLabel user={option} />,
            value: option,
          }
        }
        defaultOptions
        classNamePrefix="rounded-0 "
        onChange={onChangeSearchedPlayer}
        loadOptions={loadOptions}
      />
    </div>
  );
});

const mapStagesToTitle = {
  0: 'one',
  1: 'two',
  2: 'three',
  3: 'four',
  4: 'five',
  5: 'six',
  6: 'seven',
  7: 'eight',
  8: 'nine',
  9: 'ten',
};

const SearchedUserPanel = memo(({
  searchedUser,
  matchList,
  mapPlayerIdToLocalRating,
  currentUserId,
  tournamentId,
}) => {
  if (!searchedUser) {
    return <></>;
  }

  const userMatches = matchList.filter(match => match.playerIds.includes(searchedUser.id));

  return (
    <TournamentUserPanel
      key={`search-user-panel-${searchedUser.id}`}
      matches={userMatches}
      tournamentId={tournamentId}
      currentUserId={currentUserId}
      userId={searchedUser.id}
      name={searchedUser.name}
      score={searchedUser.score}
      place={searchedUser.rank}
      localPlace={mapPlayerIdToLocalRating[searchedUser.id]}
      searchedUserId={searchedUser.id}
    />
  );
});

const PlayersList = memo(
  ({
    players,
    mapPlayerIdToLocalRating,
    matchList,
    currentUserId,
    searchedUserId,
    tournamentId,
  }) => players.map(player => {
      if (player.id === searchedUserId) {
        return <></>;
      }

      const userMatches = matchList.filter(match => match.playerIds.includes(player.id));

      return (
        <TournamentUserPanel
          key={`user-panel-${player.id}`}
          matches={userMatches}
          tournamentId={tournamentId}
          currentUserId={currentUserId}
          userId={player.id}
          name={player.name}
          score={player.score}
          place={player.rank}
          localPlace={mapPlayerIdToLocalRating[player.id]}
          searchedUserId={searchedUserId}
        />
      );
    }),
);

function CustomMatchesPanel({
  roundsLimit = 1,
  currentRound = 0,
  matches,
  players,
  currentUserId,
  tournamentId,
  pageNumber,
  pageSize,
}) {
  const dispatch = useDispatch();
  const [searchedUser, setSearchedUser] = useState();
  const [openedStage, setOpenedStage] = useState(currentRound);

  const playersList = useMemo(
    () => Object.values(players)
        .slice(0 + pageSize * (pageNumber - 1), pageSize * pageNumber)
        .reduce((acc, player) => {
          if (player.id === currentUserId) {
            return [player, ...acc];
          }

          acc.push(player);
          return acc;
        }, []),
    [players, currentUserId, pageSize, pageNumber],
  );
  const mapPlayerIdToLocalRating = useMemo(
    () => playersList
        .slice()
        .sort((a, b) => b.score - a.score)
        .reduce((acc, p, index) => ({ ...acc, [p.id]: index + 1 }), {}),
    [playersList],
  );
  const matchList = useMemo(() => reverse(Object.values(matches)), [matches]);
  const stages = useMemo(() => range(roundsLimit), [roundsLimit]);

  useEffect(() => {
    if (currentRound !== openedStage) {
      setOpenedStage(currentRound);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound]);

  useEffect(() => {
    if (playersList.length !== 0) {
      dispatch(actions.updateUsers({ users: playersList }));
    }
  }, [playersList, dispatch]);

  useEffect(() => {
    if (searchedUser) {
      dispatch(uploadPlayersMatches(searchedUser?.id));
    }
  }, [dispatch, searchedUser]);

  useSubscribeTournamentPlayers(playersList);

  return (
    <>
      <PlayersFilterPanel option={searchedUser} setOption={setSearchedUser} />
      {roundsLimit < 2 ? (
        <>
          <SearchedUserPanel
            searchedUser={searchedUser}
            matchList={matchList}
            mapPlayerIdToLocalRating={mapPlayerIdToLocalRating}
            currentUserId={currentUserId}
            tournamentId={tournamentId}
          />
          <PlayersList
            players={playersList}
            mapPlayerIdToLocalRating={mapPlayerIdToLocalRating}
            matchList={matchList}
            currentUserId={currentUserId}
            searchedUserId={searchedUser?.id}
            tournamentId={tournamentId}
          />
        </>
      ) : (
        <nav>
          <div className={navTabsClassName} id="nav-matches-tab" role="tablist">
            {stages.map(stage => (
              <a
                className={tabLinkClassName(openedStage === stage, stage === currentRound)}
                id={`stage-${mapStagesToTitle[stage]}`}
                key={`stage-tab-${mapStagesToTitle[stage]}`}
                data-toggle="tab"
                href={`#stage-${mapStagesToTitle[stage]}`}
                role="tab"
                aria-controls={`stage-${mapStagesToTitle[stage]}`}
                aria-selected="true"
                onClick={() => {
                  setOpenedStage(stage);
                }}
              >
                {`Stage ${mapStagesToTitle[stage]}`}
              </a>
            ))}
          </div>

          <div
            className="tab-content flex-grow-1 mt-2"
            id="nav-matches-tabContent"
          >
            {stages.map(stage => {
              const stageMatches = matchList.filter(
                match => match.round === stage,
              );

              return (
                <div
                  id={`stage-${mapStagesToTitle[stage]}`}
                  key={`stage-${mapStagesToTitle[stage]}`}
                  className={tabContentClassName(openedStage === stage)}
                  role="tabpanel"
                  aria-labelledby={`stage-${mapStagesToTitle[stage]}-tab`}
                >
                  <SearchedUserPanel
                    key={`search-stage-${stage}-user-panel`}
                    searchedUser={searchedUser}
                    matchList={stageMatches}
                    mapPlayerIdToLocalRating={mapPlayerIdToLocalRating}
                    currentUserId={currentUserId}
                    tournamentId={tournamentId}
                  />
                  <PlayersList
                    key={`stage-${stage}-user-list`}
                    players={playersList}
                    mapPlayerIdToLocalRating={mapPlayerIdToLocalRating}
                    matchList={stageMatches}
                    currentUserId={currentUserId}
                    searchedUserId={searchedUser?.id}
                    tournamentId={tournamentId}
                  />
                </div>
              );
            })}
          </div>
        </nav>
      )}
      <TournamentPlayersPagination
        pageNumber={pageNumber}
        pageSize={pageSize}
      />
    </>
  );
}

export default memo(CustomMatchesPanel);
