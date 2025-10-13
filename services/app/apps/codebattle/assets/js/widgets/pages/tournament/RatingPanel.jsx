import React, {
  useMemo,
  useState,
  useEffect,
  memo,
} from 'react';

import cn from 'classnames';
import range from 'lodash/range';
import reverse from 'lodash/reverse';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import mapStagesToTitle from '../../config/mapStagesToTitle';
import { uploadPlayersMatches } from '../../middlewares/Tournament';
import { actions } from '../../slices';
// import useSubscribeTournamentPlayers from '../../utils/useSubscribeTournamentPlayers';

import StageTitle from './StageTitle';
import TournamentPlayersPagination from './TournamentPlayersPagination';
import TournamentUserPanel from './TournamentUserPanel';

const navPlayerTabsClassName = cn(
  'nav nav-tabs flex-nowrap text-center border-top border-bottom-0 cb-border-color',
  'text-uppercase font-weight-bold',
  'cb-overflow-x-auto cb-overflow-y-hidden',
);

const tabLinkClassName = (active, isCurrent = false) => cn(
  'nav-item nav-link text-uppercase text-nowrap rounded-0 font-weight-bold p-3 border-0 w-100', {
  active,
  'text-primary': isCurrent,
},
);

const tabContentClassName = active => cn('tab-pane fade', {
  'd-flex flex-column show active': active,
});

const PlayersList = memo(
  ({
    players,
    matchList,
    currentUserId,
    searchedUserId,
    hideBots,
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
        place={player.place}
        isBanned={player.isBanned}
        searchedUserId={searchedUserId}
        hideBots={hideBots}
      />
    );
  }),
);

const SearchedUserPanel = memo(({
  searchedUser,
  matchList,
  currentUserId,
}) => {
  if (!searchedUser) {
    return <></>;
  }

  const userMatches = matchList.filter(match => match.playerIds.includes(searchedUser.id));

  return (
    <TournamentUserPanel
      key={`search-user-panel-${searchedUser.id}`}
      matches={userMatches}
      currentUserId={currentUserId}
      userId={searchedUser.id}
      name={searchedUser.name}
      score={searchedUser.score}
      place={searchedUser.place}
      isBanned={searchedUser.isBanned}
      searchedUserId={searchedUser.id}
    />
  );
});

function RatingPanel({
  searchedUser,
  roundsLimit,
  currentRoundPosition,
  matches,
  players,
  topPlayerIds,
  currentUserId,
  pageNumber,
  pageSize,
  hideBots,
  hideResults,
}) {
  const dispatch = useDispatch();
  const [openedStage, setOpenedStage] = useState(currentRoundPosition);

  const playersList = useMemo(
    () => Object.values(players)
      .sort((a, b) => b.score - a.score)
      .slice(0 + pageSize * (pageNumber - 1), pageSize * pageNumber)
      .reduce((acc, player) => {
        if (player.isBot && hideBots) {
          return acc;
        }

        if (player.id === currentUserId) {
          return [player, ...acc];
        }

        acc.push(player);
        return acc;
      }, []),
    [players, currentUserId, pageSize, pageNumber, hideBots],
  );
  const topPlayersList = useMemo(
    () => (topPlayerIds || [])
      .slice(0 + pageSize * (pageNumber - 1), pageSize * pageNumber)
      .map(id => players[id])
      .sort((a, b) => b.score - a.score)
      .reduce((acc, player) => {
        if (player.isBot && hideBots) {
          return acc;
        }

        if (player.id === currentUserId) {
          return [player, ...acc];
        }

        acc.push(player);
        return acc;
      }, []),
    [topPlayerIds, players, currentUserId, pageSize, pageNumber, hideBots],
  );

  const playersShowList = (topPlayerIds || []).length === 0 ? playersList : topPlayersList;
  const matchList = useMemo(() => reverse(Object.values(matches)), [matches]);
  const stages = useMemo(() => range(roundsLimit), [roundsLimit]);

  useEffect(() => {
    if (searchedUser) {
      dispatch(uploadPlayersMatches(searchedUser?.id));
    }
  }, [dispatch, searchedUser]);

  useEffect(() => {
    if (currentRoundPosition !== openedStage) {
      setOpenedStage(currentRoundPosition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundPosition]);

  useEffect(() => {
    if (playersShowList.length !== 0) {
      dispatch(actions.updateUsers({ users: playersShowList }));
    }
  }, [playersShowList, dispatch]);

  if (hideResults) {
    return (
      <div
        className={cn(
          'flex text-center border-top border-bottom-0 cb-border-color',
          'text-uppercase font-weight-bold pt-2',
        )}
      >
        {i18n.t('Wait reviling results')}
      </div>
    );
  }

  return (
    <>
      {roundsLimit < 2 ? (
        <>
          <SearchedUserPanel
            searchedUser={searchedUser}
            matchList={matchList}
            currentUserId={currentUserId}
          />
          <PlayersList
            players={playersShowList}
            matchList={matchList}
            currentUserId={currentUserId}
            searchedUserId={searchedUser?.id}
            hideBots={hideBots}
          />
        </>
      ) : (
        <nav>
          <div className={navPlayerTabsClassName} id="nav-matches-tab" role="tablist">
            {stages.map(stage => (
              <a
                className={tabLinkClassName(
                  openedStage === stage,
                  stage === currentRoundPosition,
                )}
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
                <StageTitle
                  stage={stage}
                  stagesLimit={roundsLimit}
                />
              </a>
            ))}
          </div>

          <div
            className="tab-content flex-grow-1"
            id="nav-matches-tabContent"
          >
            {stages.map(stage => {
              const stageMatches = matchList.filter(
                match => match.roundPosition === stage,
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
                    currentUserId={currentUserId}
                  />
                  <PlayersList
                    key={`stage-${stage}-user-list`}
                    players={playersShowList}
                    matchList={stageMatches}
                    currentUserId={currentUserId}
                    searchedUserId={searchedUser?.id}
                    hideBots={hideBots}
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

export default memo(RatingPanel);
