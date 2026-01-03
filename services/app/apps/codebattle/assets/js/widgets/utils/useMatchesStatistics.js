import { useMemo } from 'react';

import sum from 'lodash/sum';

const emptyStats = {
  playerId: null,
  matchesCount: 0,
  winMatches: [],
  lostMatches: [],
  avgTests: 0,
  avgDuration: 0,
};

/**
 * return tournament matches statistics for player
 *
 * @typedef {{result: string, resultPercent: number, durationSec: number}} PlayerResult
 * @typedef {Object.<number, PlayerResult>} PlayerResults
 * @typedef {{playerIds: array, winnerId: number, playerResults: [PlayerResults]}} Match
 * @typedef {{
 *  playerId: {?number},
 *  matchesCount: number,
 *  winMatches: Match[],
 *  lostMatches: Match[],
 *  avgTests: number,
 *  avgDuration: number,
 * }} PlayerStatistics
 *
 * @param {number} playerId - player id
 * @param {Match[]} matches - list of matches per round
 * @return {[PlayerStatistics, PlayerStatistics]}
 *
 */
function useMatchesStatistics(playerId, matches) {
  return useMemo(() => {
    if (!matches || (matches.length === 0 && playerId)) {
      return [emptyStats, emptyStats];
    }

    const finishedMatches = matches.filter(
      (match) => !!match.playerResults[playerId],
    );
    const matchesCount = finishedMatches.length;

    const opponentId = matches[0].playerIds.find((id) => id !== playerId);
    const playerWinMatches = matches.filter(
      (match) => playerId === match.winnerId,
    );
    const playerLostMatches = matches.filter(
      (match) => playerId !== match.winnerId
        && match.playerIds.some((id) => id === playerId)
        && match.playerIds.some((id) => id === match.winnerId),
    );
    const opponentWinMatches = matches.filter(
      (match) => opponentId === match.winnerId,
    );
    const opponentLostMatches = matches.filter(
      (match) => opponentId !== match.winnerId
        && match.playerIds.some((id) => id === opponentId)
        && match.playerIds.some((id) => id === match.winnerId),
    );

    const playerAvgTests = matchesCount !== 0
        ? sum(
            finishedMatches.map(
              (match) => match.playerResults[playerId]?.resultPercent || 0,
            ),
          ) / matchesCount
        : 0;
    const opponentAvgTests = matchesCount !== 0
        ? sum(
            finishedMatches.map(
              (match) => match.playerResults[opponentId]?.resultPercent || 0,
            ),
          ) / matchesCount
        : 0;

    const playerAvgDuration = finishedMatches.filter((match) => match.winnerId === playerId).length !== 0
        ? sum(
            finishedMatches.filter((match) => match.winnerId === playerId).map(
              (match) => match?.durationSec || 0,
            ),
          ) / finishedMatches.filter((match) => match.winnerId === playerId).length
        : 0;
    const opponentAvgDuration = finishedMatches.filter((match) => match.winnerId === opponentId).length !== 0
        ? sum(
            finishedMatches.filter((match) => match.winnerId === opponentId).map(
              (match) => match?.durationSec || 0,
            ),
          ) / finishedMatches.filter((match) => match.winnerId === opponentId).length
        : 0;

    const player = {
      playerId,
      matchesCount: matches.length,
      winMatches: playerWinMatches,
      lostMatches: playerLostMatches,
      avgTests: playerAvgTests,
      avgDuration: playerAvgDuration,
    };
    const opponent = {
      playerId: opponentId,
      matchesCount: matches.length,
      winMatches: opponentWinMatches,
      lostMatches: opponentLostMatches,
      avgTests: opponentAvgTests,
      avgDuration: opponentAvgDuration,
    };

    return [player, opponent];
  }, [playerId, matches]);
}

export default useMatchesStatistics;
