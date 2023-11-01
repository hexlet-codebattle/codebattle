import { useMemo } from 'react';

import sum from 'lodash/sum';

const emptyStats = {
  playerId: null,
  winMatches: [],
  score: 0,
  avgTests: 0,
  avgDuration: 0,
};

/**
 * return tournament players statistics per round
 *
 * @typedef {{result: string, score: number, resultPercent: number, durationSec: number}} PlayerResult
 * @typedef {Object.<number, PlayerResult>} PlayerResults
 * @typedef {{playerIds: array, winnerId: number, playerResults: [PlayerResults]}} Match
 * @typedef {{playerId: {?number}, winMatches: Match[], score: number, avgTests: number, avgDuration: number}} PlayerStatistics
 *
 * @param {number} playerId - player id
 * @param {Match[]} matches - list of matches per round
 * @return {[PlayerStatistics, PlayerStatistics]}
 *
 */
function useRoundStatistics(playerId, matches) {
  return useMemo(() => {
    if (matches.length === 0 && playerId) {
      return [emptyStats, emptyStats];
    }

    const finishedMatches = matches.filter(
      match => !!match.playerResults[playerId],
    );
    const matchesCount = finishedMatches.length;

    const opponentId = matches[0].playerIds.find(id => id !== playerId);
    const playerWinMatches = matches.filter(
      match => playerId === match.winnerId,
    );
    const opponentWinMatches = matches.filter(
      match => opponentId === match.winnerId,
    );

    const playerScore = sum(
      finishedMatches.map(match => match.playerResults[playerId]?.score || 0),
    );
    const opponentScore = sum(
      finishedMatches.map(
        match => match.playerResults[opponentId]?.score || 0,
      ),
    );

    const playerAvgTests = matchesCount !== 0
        ? sum(
            finishedMatches.map(
              match => match.playerResults[playerId]?.resultPercent || 0,
            ),
          ) / matchesCount
        : 0;
    const opponentAvgTests = matchesCount !== 0
        ? sum(
            finishedMatches.map(
              match => match.playerResults[opponentId]?.resultPercent || 0,
            ),
          ) / matchesCount
        : 0;

    const playerAvgDuration = matchesCount !== 0
        ? sum(
            finishedMatches.map(
              match => match.playerResults[playerId]?.durationSec || 0,
            ),
          ) / matchesCount
        : 0;
    const opponentAvgDuration = matchesCount !== 0
        ? sum(
            finishedMatches.map(
              match => match.playerResults[opponentId]?.durationSec || 0,
            ),
          ) / matchesCount
        : 0;

    const player = {
      playerId,
      winMatches: playerWinMatches,
      score: playerScore,
      avgTests: playerAvgTests,
      avgDuration: playerAvgDuration,
    };
    const opponent = {
      playerId: opponentId,
      winMatches: opponentWinMatches,
      score: opponentScore,
      avgTests: opponentAvgTests,
      avgDuration: opponentAvgDuration,
    };

    return [player, opponent];
  }, [playerId, matches]);
}

export default useRoundStatistics;
