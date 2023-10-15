import React, {
 memo, useMemo, useState, useEffect, useCallback,
} from 'react';

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

const tabLinkClassName = active => cn(
    'nav-item nav-link text-uppercase text-nowrap rounded-0 font-weight-bold p-3 border-0 w-100',
    { active },
  );

const tabContentClassName = active => cn('tab-pane fade', {
    'd-flex flex-column show active': active,
  });

function PlayersFilterPanel({ option, setOption }) {
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

  if (!isAdmin) {
    return <></>;
  }

  return (
    <div className="d-flex justify-content-between mb-2 w-50">
      <AsyncSelect
        className="w-75"
        value={
          option && {
            label: <UserLabel user={option} />,
            value: option,
          }
        }
        defaultOptions
        onChange={onChangeSearchedPlayer}
        loadOptions={loadOptions}
      />
    </div>
  );
}

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

const PlayersList = memo(
  ({
    players,
    mapPlayerIdToLocalRating,
    matchList,
    currentUserId,
    searchedUserId,
  }) => players.map(player => {
      if (player.id === searchedUserId) {
        return <></>;
      }

      const userMatches = matchList.filter(match => match.playerIds.includes(player.id));

      return (
        <TournamentUserPanel
          key={`user-panel-${player.id}`}
          matches={userMatches}
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
  matches,
  players,
  currentUserId,
}) {
  const dispatch = useDispatch();
  const [searchedUser, setSearchedUser] = useState();
  const [openedStage, setOpenedStage] = useState(0);

  const playersList = useMemo(
    () => Object.values(players).reduce((acc, player) => {
        if (player.id === currentUserId) {
          return [player, ...acc];
        }

        acc.push(player);
        return acc;
      }, []),
    [players, currentUserId],
  );
  const mapPlayerIdToLocalRating = useMemo(
    () => playersList
        .sort((a, b) => b.score - a.score)
        .reduce((acc, p, index) => ({ ...acc, [p.id]: index + 1 }), {}),
    [playersList],
  );
  const matchList = useMemo(() => reverse(Object.values(matches)), [matches]);
  const stages = useMemo(() => range(roundsLimit), [roundsLimit]);

  const pageNumber = useSelector(state => state.tournament.playersPageNumber);
  const pageSize = useSelector(state => state.tournament.playersPageSize);

  useEffect(() => {
    if (playersList.length !== 0) {
      dispatch(actions.updateUsers({ users: playersList }));
    }
  }, [playersList, dispatch]);

  useEffect(() => {
    if (searchedUser) {
      dispatch(
        uploadPlayersMatches(searchedUser?.id),
      );
    }
  }, [dispatch, searchedUser]);

  useSubscribeTournamentPlayers(playersList);

  return (
    <>
      <PlayersFilterPanel option={searchedUser} setOption={setSearchedUser} />
      {roundsLimit < 2 ? (
        <>
          {searchedUser
            && (() => {
              const userMatches = matchList.filter(match => match.playerIds.includes(searchedUser.id));

              return (
                <TournamentUserPanel
                  key={`user-panel-${searchedUser.id}`}
                  matches={userMatches}
                  currentUserId={currentUserId}
                  userId={searchedUser.id}
                  name={searchedUser.name}
                  score={searchedUser.score}
                  place={searchedUser.rank}
                  searchedUserId={searchedUser.id}
                />
              );
            })}
          <PlayersList
            players={playersList}
            mapPlayerIdToLocalRating={mapPlayerIdToLocalRating}
            matchList={matchList}
            currentUserId={currentUserId}
            searchedUserId={searchedUser?.id}
          />
        </>
      ) : (
        <nav>
          <div className={navTabsClassName} id="nav-matches-tab" role="tablist">
            {stages.map(stage => (
              <a
                className={tabLinkClassName(openedStage === stage)}
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
                  <PlayersList
                    players={playersList}
                    mapPlayerIdToLocalRating={mapPlayerIdToLocalRating}
                    matchList={stageMatches}
                    currentUserId={currentUserId}
                    searchedUserId={searchedUser?.id}
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
