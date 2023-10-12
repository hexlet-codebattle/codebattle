import React, {
  memo, useMemo, useState, useEffect, useCallback,
} from 'react';

import cn from 'classnames';
import range from 'lodash/range';
import reverse from 'lodash/reverse';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';

import UserLabel from '../../components/UserLabel';
import { searchTournamentPlayers } from '../../middlewares/Tournament';
import { actions } from '../../slices';
import useSubscribeTournamentPlayers from '../../utils/useSubscribeTournamentPlayers';

import TournamentPlayersPagination from './TournamentPlayersPagination';
import TournamentUserPanel from './TournamentUserPanel';
import UsersMatchList from './UsersMatchList';

const navTabsClassName = cn(
  'nav nav-tabs flex-nowrap text-center border-0',
  'text-uppercase font-weight-bold',
  'cb-overflow-x-auto cb-overflow-y-hidden',
);

const tabLinkClassName = active => cn(
  'nav-item nav-link text-uppercase text-nowrap rounded-0 font-weight-bold p-3 border-0 w-100',
  { active },
);

const tabContentClassName = active => cn('tab-pane fade', {
  'd-flex flex-column show active': active,
});

function PlayersFilterPanel({
  option,
  showAllPlayers,
  setOption,
  setShowAllPlayers,
}) {
  const dispatch = useDispatch();

  const onChangeSearchedPlayer = useCallback(({ value }) => setOption(value), [setOption]);
  const loadOptions = useCallback(
    (inputValue, callback) => {
      searchTournamentPlayers({ name_ilike: inputValue })
        .then(users => {
          const options = users.map(user => ({
            label: <UserLabel user={user} />,
            value: user,
          }));

          callback(options);
        })
        .catch(error => {
          dispatch(actions.setError(error));
        });
    },
    [dispatch],
  );

  const onChangeView = useCallback(() => {
    setShowAllPlayers(!showAllPlayers);
  }, [setShowAllPlayers, showAllPlayers]);

  return (
    <div className="d-flex justify-content-between mb-2">
      <AsyncSelect
        className="w-25"
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
      <div className="d-flex custom-control custom-switch">
        <input
          type="checkbox"
          className="custom-control-input"
          id="tournament-matches-view"
          checked={showAllPlayers}
          onChange={onChangeView}
        />
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control, jsx-a11y/label-has-for */}
        <label
          className="custom-control-label"
          htmlFor="tournament-matches-view"
        >
          Show all players
        </label>
      </div>
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

function PlayersList({
  players, matchList, currentUserId, searchedUserId,
}) {
  return players.map(player => {
    if (searchedUserId === player.id) {
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
        rank={player.rank}
        searchedUserId={searchedUserId}
      />
    );
  });
}

function CustomMatchesPanel({
  roundsLimit = 1,
  matches,
  players,
  currentUserId,
}) {
  const dispatch = useDispatch();
  const [searchedUser, setSearchedUser] = useState();
  const [openedStage, setOpenedStage] = useState(0);

  const playersList = useMemo(() => Object.values(players).reduce((acc, player) => {
    if (player.id === currentUserId) {
      return [player, ...acc];
    }

    acc.push(player);
    return acc;
  }, []), [players, currentUserId]);
  const matchList = useMemo(() => reverse(Object.values(matches)), [matches]);
  const stages = useMemo(() => range(roundsLimit), [roundsLimit]);

  const [showAllPlayers, setShowAllPlayers] = useState(
    !playersList.some(p => p.id === currentUserId),
  );

  const currentUserMatches = useMemo(
    () => matchList.filter(match => match.playerIds.includes(currentUserId)),
    [matchList, currentUserId],
  );

  useEffect(() => {
    if (playersList.length !== 0) {
      dispatch(actions.updateUsers({ users: playersList }));
    }
  }, [playersList, dispatch]);

  useSubscribeTournamentPlayers(playersList);

  return (
    <>
      <PlayersFilterPanel
        option={searchedUser}
        showAllPlayers={showAllPlayers}
        setOption={setSearchedUser}
        setShowAllPlayers={setShowAllPlayers}
      />
      {roundsLimit < 2 ? (
        <div>
          {showAllPlayers ? (
            playersList.map(player => {
              const userMatches = matchList.filter(match => match.playerIds.includes(player.id));

              return (
                <TournamentUserPanel
                  key={`user-panel-${player.id}`}
                  matches={reverse(userMatches)}
                  currentUserId={currentUserId}
                  userId={player.id}
                  name={player.name}
                  score={player.score}
                  rank={player.rank}
                  searchedUserId={searchedUser?.id}
                />
              );
            })
          ) : (
            <UsersMatchList
              key={`match-list-${currentUserId}`}
              currentUserId={currentUserId}
              matches={currentUserMatches}
            />
          )}
        </div>
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
                match => match.round === stage
                  && (showAllPlayers || match.playerIds.includes(currentUserId)),
              );

              return (
                <div
                  id={`stage-${mapStagesToTitle[stage]}`}
                  key={`stage-${mapStagesToTitle[stage]}`}
                  className={tabContentClassName(openedStage === stage)}
                  role="tabpanel"
                  aria-labelledby={`stage-${mapStagesToTitle[stage]}-tab`}
                >
                  {showAllPlayers ? (
                    <PlayersList
                      players={playersList}
                      matchList={stageMatches}
                      currentUserId={currentUserId}
                      searchedUserId={searchedUser?.id}
                    />
                  ) : (
                    <UsersMatchList
                      key={`match-list-${currentUserId}`}
                      currentUserId={currentUserId}
                      matches={stageMatches}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      )}
      <TournamentPlayersPagination />
    </>
  );
}

export default memo(CustomMatchesPanel);
