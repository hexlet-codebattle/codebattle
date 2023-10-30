import React, { useCallback, useEffect, memo } from 'react';

import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import {
  tournamentSelector,
  firstPlayerSelector,
  secondPlayerSelector,
} from '@/selectors';
import useRoundStatistics from '@/utils/useRoundStatistics';

import TournamentStateCodes from '../../config/tournament';

function TournamentStatisticsModal({ modalShowing, setModalShowing }) {
  const tournament = useSelector(tournamentSelector);
  const firstPlayer = useSelector(firstPlayerSelector);
  const secondPlayer = useSelector(secondPlayerSelector);

  const [player, opponent] = useRoundStatistics(
    firstPlayer.id,
    Object.values(tournament?.matches || {}),
  );

  const showTournamentStatistics = tournament.type === 'swiss'
    && secondPlayer.id === opponent.playerId
    && ((tournament.breakState === 'off'
      && tournament.state === TournamentStateCodes.finished)
      || tournament.breakState === 'on');

  useEffect(() => {
    if (!modalShowing && showTournamentStatistics) {
      setModalShowing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTournamentStatistics]);

  const handleClose = useCallback(() => {
    setModalShowing(false);
  }, [setModalShowing]);

  return (
    <Modal size="xl" show={modalShowing} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Tournament Round Statistics</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between">
          <div className="d-flex flex-column p-2">
            <span className="h4 mb-2">Player:</span>
            <span className="h4 mb-2">Score:</span>
            <span className="h4 mb-2">Wins:</span>
            <span className="h4 mb-2">AVG Tests:</span>
            <span className="h4 mb-2 text-nowrap">AVG Solving speed:</span>
          </div>
          <div className="d-flex flex-column align-items-center p-2">
            <span className="h4 mb-2">
              {firstPlayer?.name}
            </span>
            <span className="h4 mb-2">
              {player.score}
            </span>
            <span className="h4 mb-2">
              {player.winMatches.length}
            </span>
            <span className="h4 mb-2">
              {player.avgTests}
              %
            </span>
            <span className="h4 mb-2">
              {player.avgDuration}
            </span>
          </div>
          <div className="d-flex flex-column align-items-center p-2">
            <span className="h4 mb-2">
              {secondPlayer?.name}
            </span>
            <span className="h4 mb-2">
              {opponent.score}
            </span>
            <span className="h4 mb-2">
              {opponent.winMatches.length}
            </span>
            <span className="h4 mb-2">
              {opponent.avgTests}
              %
            </span>
            <span className="h4 mb-2">
              {opponent.avgDuration}
            </span>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default memo(TournamentStatisticsModal);
