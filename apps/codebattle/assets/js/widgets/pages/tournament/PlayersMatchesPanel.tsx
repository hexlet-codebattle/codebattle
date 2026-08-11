import React, { useMemo, useState, useEffect, useRef, memo } from 'react';

import { Flex } from '@mantine/core';

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
import { type AppDispatch } from '@/slices';
// import useSubscribeTournamentPlayers from '../../utils/useSubscribeTournamentPlayers';

import TournamentPlayersPagination from './TournamentPlayersPagination';
import TournamentUserPanel from './TournamentUserPanel';
import Top200RedirectButton from './Top200RedirectButton';

const searchLabelStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
  marginBottom: 0,
  marginRight: '0.5rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: '0.875rem',
};

const searchInputStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  fontSize: '0.875rem',
  color: '#ffffff',
};

const fuzzyBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.25em 0.4em',
  fontSize: '0.75em',
  fontWeight: 700,
  lineHeight: 1,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  verticalAlign: 'baseline',
  borderRadius: '0.25rem',
  marginLeft: '0.5rem',
};

interface MatchesPanelPlayer {
  id: number;
  name?: string;
  score?: number;
  place?: number;
  winsCount?: number;
  lang?: string;
  isBot?: boolean;
  isBanned?: boolean;
  [key: string]: unknown;
}

interface PanelMatch {
  playerIds: number[];
  [key: string]: unknown;
}

const isFuzzyMatch = (value: string, query: string) => {
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

interface PlayersListProps {
  players: MatchesPanelPlayer[];
  matchList: PanelMatch[];
  currentUserId: number;
  searchedUserId?: number;
  hideBots?: boolean;
}

const PlayersList = memo(
  ({ players, matchList, currentUserId, searchedUserId, hideBots }: PlayersListProps) =>
    players.map((player) => {
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
          winsCount={player.winsCount}
          lang={player.lang}
          isBanned={player.isBanned}
          searchedUserId={searchedUserId}
          hideBots={hideBots}
        />
      );
    }),
);

interface SearchedUserPanelProps {
  searchedUser?: MatchesPanelPlayer;
  matchList: PanelMatch[];
  currentUserId: number;
}

const SearchedUserPanel = memo(
  ({ searchedUser, matchList, currentUserId }: SearchedUserPanelProps) => {
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
        winsCount={searchedUser.winsCount}
        lang={searchedUser.lang}
        isBanned={searchedUser.isBanned}
        searchedUserId={searchedUser.id}
      />
    );
  },
);

interface PlayersMatchesPanelProps {
  searchedUser?: MatchesPanelPlayer;
  roundsLimit: number;
  matches: Record<number, PanelMatch>;
  players: Record<number, MatchesPanelPlayer>;
  topPlayerIds?: number[];
  currentUserId: number;
  currentRoundPosition: number;
  playersCount: number;
  playersRedirectUrl?: string;
  pageNumber: number;
  pageSize: number;
  hideBots?: boolean;
  hideResults?: boolean;
  canModerate?: boolean;
  type?: string;
}

function PlayersMatchesPanel({
  searchedUser,
  roundsLimit,
  matches,
  players,
  topPlayerIds,
  currentUserId,
  currentRoundPosition,
  playersCount,
  playersRedirectUrl,
  pageNumber,
  pageSize,
  hideBots,
  hideResults,
  canModerate,
  type,
}: PlayersMatchesPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
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
    const shouldUseAllPlayers =
      Object.keys(players).length > (topPlayerIds || []).length ||
      (topPlayerIds || []).length === 0;
    const sortedPlayers = shouldUseAllPlayers
      ? Object.values(players)
      : (topPlayerIds || []).map((id) => players[id]).filter(Boolean);

    return sortedPlayers
      .filter((player) => !(player.isBot && hideBots))
      .filter((player) => isFuzzyMatch((player.name || '').toLowerCase(), normalizedSearch))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [players, topPlayerIds, hideBots, normalizedSearch]);

  const normalizedPageSize = Number(pageSize);
  const safePageSize = normalizedPageSize > 0 ? normalizedPageSize : 16;
  const totalPages = Math.max(1, Math.ceil(basePlayersList.length / safePageSize));
  const normalizedPageNumber = Number(pageNumber);
  const safePageNumber =
    Number.isFinite(normalizedPageNumber) && normalizedPageNumber > 0
      ? Math.min(normalizedPageNumber, totalPages)
      : 1;

  const playersShowList = useMemo(
    () =>
      basePlayersList
        .slice(safePageSize * (safePageNumber - 1), safePageSize * safePageNumber)
        .reduce<MatchesPanelPlayer[]>((acc, player) => {
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
      const uploadMatches = canModerate ? uploadPlayersMatchesAdmin : uploadPlayersMatchesUser;
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
    const requestMatches = canModerate ? requestMatchesForRoundAdmin : requestMatchesForRoundUser;
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
    dispatch(
      requestAllPlayersAdmin(() => {
        requestAllPlayersInFlight.current = false;
      }),
    );
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
  const currentPlayer = players[currentUserId];

  return (
    <>
      <Top200RedirectButton
        currentRoundPosition={currentRoundPosition}
        player={currentPlayer}
        playersRedirectUrl={playersRedirectUrl}
        type={type}
      />
      {showHideResultsNotice && (
        <div
          className="cb-border-color"
          style={{
            display: 'flex',
            textAlign: 'center',
            borderTop: '1px solid #4c4c5a',
            textTransform: 'uppercase',
            fontWeight: 700,
            paddingTop: '0.5rem',
          }}
        >
          {i18n.t('Wait revealing results')}
        </div>
      )}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ md: 'center' }}
        justify="space-between"
        gap={8}
        className="cb-border-color"
        style={{
          borderTop: '1px solid #4c4c5a',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
        }}
      >
        <Flex align="center" gap={8} w="100%">
          <label htmlFor="players-search" className="cb-text-light" style={searchLabelStyle}>
            {i18n.t('Fuzzy search')}
          </label>
          <input
            id="players-search"
            aria-label={i18n.t('Fuzzy search')}
            type="text"
            value={searchTerm}
            placeholder={i18n.t('Type a player name')}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="cb-bg-highlight-panel cb-border-color"
            style={searchInputStyle}
          />
          <span className="cb-text-light cb-bg-panel" style={fuzzyBadgeStyle}>
            {i18n.t('Matches letters in order')}
          </span>
        </Flex>
      </Flex>
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
