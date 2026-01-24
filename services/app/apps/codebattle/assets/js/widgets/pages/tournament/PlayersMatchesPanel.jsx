import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  memo,
} from 'react';

import cn from 'classnames';
import reverse from 'lodash/reverse';
import { useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import {
  requestMatchesForRound as requestMatchesForRoundUser,
  uploadPlayersMatches as uploadPlayersMatchesUser,
} from '../../middlewares/Tournament';
import {
  requestAllPlayers as requestAllPlayersAdmin,
  requestMatchesForRound as requestMatchesForRoundAdmin,
  uploadPlayersMatches as uploadPlayersMatchesAdmin,
} from '../../middlewares/TournamentAdmin';
import { actions } from '../../slices';
// import useSubscribeTournamentPlayers from '../../utils/useSubscribeTournamentPlayers';

import TournamentPlayersPagination from './TournamentPlayersPagination';
import TournamentUserPanel from './TournamentUserPanel';

const filterControlsClassName = cn(
  'd-flex flex-column flex-md-row align-items-md-center justify-content-between',
  'border-top border-bottom-0 cb-border-color py-2 gap-2',
);

const searchLabelClassName = cn(
  'text-nowrap mb-0 mr-2 font-weight-bold text-uppercase small',
  'cb-text',
);

const searchInputClassName = cn(
  'form-control form-control-sm',
  'cb-bg-highlight-panel cb-border-color text-white',
);

const fuzzyBadgeClassName = cn(
  'badge cb-text ml-2',
  'cb-bg-panel',
);

const isFuzzyMatch = (value, query) => {
  if (!query) return true;
  if (!value) return false;

  let valueIndex = 0;
  let queryIndex = 0;

  while (valueIndex < value.length && queryIndex < query.length) {
    if (value[valueIndex] === query[queryIndex]) {
      queryIndex += 1;
    }
    valueIndex += 1;
  }

  return queryIndex === query.length;
};

const PlayersList = memo(
  ({
    players,
    matchList,
    currentUserId,
    searchedUserId,
    hideBots,
  }) => players.map((player) => {
    if (player.id === searchedUserId) {
      return <></>;
    }

    const userMatches = matchList.filter((match) => match.playerIds.includes(player.id));

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

  const userMatches = matchList.filter((match) => match.playerIds.includes(searchedUser.id));

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

function PlayersMatchesPanel({
  searchedUser,
  roundsLimit,
  matches,
  players,
  topPlayerIds,
  currentUserId,
  playersCount,
  pageNumber,
  pageSize,
  hideBots,
  hideResults,
  canModerate,
}) {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const requestedRoundMatches = useRef(false);
  const requestedAllPlayers = useRef(false);
  const requestAllPlayersInFlight = useRef(false);
  // console.log('Players & Matches debug', {
  //   isAdmin,
  //   isOwner,
  //   playersCount: Object.keys(players || {}).length,
  //   topPlayerIdsCount: (topPlayerIds || []).length,
  // });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchList = useMemo(() => reverse(Object.values(matches)), [matches]);

  const basePlayersList = useMemo(() => {
    const shouldUseAllPlayers = Object.keys(players).length > (topPlayerIds || []).length
      || (topPlayerIds || []).length === 0;
    const sortedPlayers = shouldUseAllPlayers
      ? Object.values(players)
      : (topPlayerIds || []).map((id) => players[id]).filter(Boolean);

    return sortedPlayers
      .filter((player) => !(player.isBot && hideBots))
      .filter((player) => isFuzzyMatch((player.name || '').toLowerCase(), normalizedSearch))
      .sort((a, b) => b.score - a.score);
  }, [players, topPlayerIds, hideBots, normalizedSearch]);

  const normalizedPageSize = Number(pageSize);
  const safePageSize = normalizedPageSize > 0 ? normalizedPageSize : 16;
  const totalPages = Math.max(1, Math.ceil(basePlayersList.length / safePageSize));
  const normalizedPageNumber = Number(pageNumber);
  const safePageNumber = Number.isFinite(normalizedPageNumber) && normalizedPageNumber > 0
    ? Math.min(normalizedPageNumber, totalPages)
    : 1;

  const playersShowList = useMemo(
    () => basePlayersList
      .slice(safePageSize * (safePageNumber - 1), safePageSize * safePageNumber)
      .reduce((acc, player) => {
        if (player.id === currentUserId) {
          return [player, ...acc];
        }

        acc.push(player);
        return acc;
      }, []),
    [basePlayersList, currentUserId, safePageSize, safePageNumber],
  );

  useEffect(() => {
    if (searchedUser) {
      const uploadMatches = canModerate
        ? uploadPlayersMatchesAdmin
        : uploadPlayersMatchesUser;
      dispatch(uploadMatches(searchedUser?.id));
    }
  }, [dispatch, searchedUser, canModerate]);

  useEffect(() => {
    if (searchedUser?.name) {
      setSearchTerm(searchedUser.name);
    }
  }, [searchedUser?.id, searchedUser?.name]);

  useEffect(() => {
    if (requestedRoundMatches.current) {
      return;
    }
    requestedRoundMatches.current = true;
    const requestMatches = canModerate
      ? requestMatchesForRoundAdmin
      : requestMatchesForRoundUser;
    dispatch(requestMatches());
  }, [dispatch, canModerate]);

  useEffect(() => {
    if (!canModerate || playersCount <= 0) {
      return;
    }

    const loadedCount = Object.keys(players).length;
    if (loadedCount >= playersCount) {
      requestedAllPlayers.current = true;
      requestAllPlayersInFlight.current = false;
      return;
    }

    if (requestedAllPlayers.current || requestAllPlayersInFlight.current) {
      return;
    }

    requestAllPlayersInFlight.current = true;
    dispatch(requestAllPlayersAdmin(() => {
      requestAllPlayersInFlight.current = false;
    }));
  }, [dispatch, canModerate, players, playersCount]);

  useEffect(() => {
    if (playersShowList.length !== 0) {
      dispatch(actions.updateUsers({ users: playersShowList }));
    }
  }, [playersShowList, dispatch]);

  useEffect(() => {
    if (pageNumber > totalPages) {
      dispatch(actions.changeTournamentPageNumber(1));
    }
  }, [dispatch, pageNumber, totalPages]);

  const showHideResultsNotice = hideResults;

  return (
    <>
      {showHideResultsNotice && (
        <div
          className={cn(
            'flex text-center border-top border-bottom-0 cb-border-color',
            'text-uppercase font-weight-bold pt-2',
          )}
        >
          {i18n.t('Wait reviling results')}
        </div>
      )}
      <div className={filterControlsClassName}>
        <div className="d-flex align-items-center gap-2 w-100">
          <label htmlFor="players-search" className={searchLabelClassName}>
            {i18n.t('Fuzzy search')}
          </label>
          <input
            id="players-search"
            type="text"
            value={searchTerm}
            placeholder={i18n.t('Type a player name')}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={searchInputClassName}
            style={{ backgroundColor: 'transparent' }}
          />
          <span className={fuzzyBadgeClassName}>
            {i18n.t('Matches letters in order')}
          </span>
        </div>
      </div>
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
      )}
      <TournamentPlayersPagination
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalEntriesOverride={basePlayersList.length}
      />
    </>
  );
}

export default memo(PlayersMatchesPanel);
