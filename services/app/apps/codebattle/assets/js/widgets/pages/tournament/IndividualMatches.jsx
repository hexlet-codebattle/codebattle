import React, {
 memo, useMemo,
} from 'react';

import cn from 'classnames';
import capitalize from 'lodash/capitalize';

import UserInfo from '../../components/UserInfo';
import TournamentStates from '../../config/tournament';
import useTimer from '../../utils/useTimer';

const RoundTypes = {
  one: 'one',
  two: 'two',
  three: 'three',
  four: 'four',
  quarter: 'quarter',
  semi: 'semi',
  final: 'final',
};

const maxPlayersPerRoundType = {
  [RoundTypes.one]: 128,
  [RoundTypes.two]: 64,
  [RoundTypes.three]: 32,
  [RoundTypes.four]: 16,
  [RoundTypes.quarter]: 8,
  [RoundTypes.semi]: 4,
  [RoundTypes.final]: 2,
};

const roundTypesValues = Object.values(RoundTypes);

const getTitleByRoundType = (type, playersCount) => {
  switch (type) {
    case RoundTypes.one:
      return 'Round 1';
    case RoundTypes.two: {
      if (maxPlayersPerRoundType[RoundTypes.two] < playersCount) {
        return 'Round 2';
      }

      return 'Round 1';
    }
    case RoundTypes.three: {
      if (maxPlayersPerRoundType[RoundTypes.two] < playersCount) {
        return 'Round 3';
      }
      if (maxPlayersPerRoundType[RoundTypes.three] < playersCount) {
        return 'Round 2';
      }

      return 'Round 1';
    }
    case RoundTypes.four: {
      if (maxPlayersPerRoundType[RoundTypes.two] < playersCount) {
        return 'Round 4';
      }
      if (maxPlayersPerRoundType[RoundTypes.three] < playersCount) {
        return 'Round 3';
      }
      if (maxPlayersPerRoundType[RoundTypes.four] < playersCount) {
        return 'Round 2';
      }

      return 'Round 1';
    }
    default:
      return capitalize(type);
  }
};

const getLinkParams = (match, currentUserId) => {
  const isWinner = match.winnerId === currentUserId;
  const isParticipant = match.playerIds.includes(currentUserId);
  const cardClassName = 'p-1 border border-success';

  switch (true) {
    case match.state === 'waiting' && isParticipant:
      return ['Wait', cn(cardClassName, 'bg-warning')];
    case (match.state === 'active' && isParticipant):
      return ['Join', cn(cardClassName, 'bg-winner')];
    case isWinner:
      return ['Show', cn(cardClassName, 'bg-winner')];
    case isParticipant:
      return ['Show', cn(cardClassName, 'x-bg-gray')];
    default:
      return ['Show', cardClassName];
  }
};

const getRange = (count, min, max) => (
  count - min === count - max
    ? [count - min]
    : [count - max, count - min]
);

const getMatchesByRound = (matches, type, playersCount) => {
  const maxPlayers = maxPlayersPerRoundType[type];
  const minPlayers = maxPlayers / 2 + 1;

  const result = Object.values(matches).slice(
    ...getRange(playersCount, minPlayers, maxPlayers),
  );

  console.log([type, playersCount], [maxPlayers, minPlayers], matches, result);

  return result;
};

const getTitleByState = state => {
  switch (state) {
    case TournamentStates.cancelled:
      return 'The tournament is cancelled';
    case TournamentStates.finished:
      return 'The tournament is finished';
    default:
      return '';
  }
};

const getResultClass = (match, playerId) => (match.winnerId === playerId ? 'fa fa-trophy' : '');

function Round({
 matches, players, playersCount, type, currentUserId,
}) {
  const showRound = playersCount > maxPlayersPerRoundType[type] / 2;

  const matchesPerRound = useMemo(
    () => (showRound ? getMatchesByRound(matches, type, playersCount) : []),
    [matches, type, playersCount, showRound],
  );

  if (!showRound) {
    return <></>;
  }

  return (
    <div className="round">
      <div className="h4 text-center">
        {getTitleByRoundType(type, playersCount)}
      </div>
      <div className="round-inner">
        {matchesPerRound.map(match => (
          <div key={match.gameId} className="match">
            <div className="match__content">
              {match ? (
                <div className={getLinkParams(match, currentUserId)[1]}>
                  <div className="d-flex justify-content-center align-items-center">
                    <span>{match.state}</span>
                    <div id={match.gameId}>
                      <a
                        href={`/games/${match.gameId}`}
                        className="btn btn-sm btn-success m-1"
                      >
                        {getLinkParams(match, currentUserId)[0]}
                      </a>
                    </div>
                  </div>
                  <div className="d-flex flex-column justify-content-around">
                    {match.playerIds.map(id => (
                      <div
                        className={`d-flex align-items-center bg-light tournament-bg-${match.state}`}
                      >
                        <UserInfo user={players[id]} hideOnlineIndicator />
                        <span className={getResultClass(match, id)} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center justify-content-center x-bg-gray">
                  <p>Waiting</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TournamentTimer({ startsAt, isOnline }) {
  const [duration, seconds] = useTimer(startsAt);

  if (!isOnline) {
    return null;
  }

  return seconds > 0 ? (
    <span>
      The tournament will start in&nbsp;
      {duration}
    </span>
  ) : (
    <span>The tournament will start soon</span>
  );
}

function TournamentStatus({ children }) {
  return (
    <div className="d-flex align-items-center justify-content-center mt-2">
      <h3 className="ml-3">{children}</h3>
    </div>
  );
}

function IndividualMatches({
  state,
  startsAt,
  matches,
  players,
  playersCount = 0,
  currentUserId,
  isLive,
  isOver,
  isOnline,
}) {
  if (!isLive && !isOver) {
    return (
      <TournamentStatus>
        <span>The tournament is cancelled</span>
      </TournamentStatus>
    );
  }

  if (state === TournamentStates.waitingParticipants) {
    return (
      <TournamentStatus>
        <TournamentTimer startsAt={startsAt} isOnline={isOnline} />
      </TournamentStatus>
    );
  }

  return (
    <>
      <TournamentStatus>{getTitleByState(state)}</TournamentStatus>

      <div className="overflow-auto mt-2">
        <div className="bracket">
          {roundTypesValues.map(type => (
            <Round
              matches={matches}
              players={players}
              playersCount={playersCount}
              type={type}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default memo(IndividualMatches);
