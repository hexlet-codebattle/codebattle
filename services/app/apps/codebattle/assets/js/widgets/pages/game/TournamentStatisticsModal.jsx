import React, {
  useEffect, memo, useMemo, useState,
} from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import {
  tournamentSelector,
  firstPlayerSelector,
  secondPlayerSelector,
  gameIdSelector,
} from '@/selectors';
import useMatchesStatistics from '@/utils/useMatchesStatistics';

import ModalCodes from '../../config/modalCodes';
import TournamentStateCodes from '../../config/tournament';

const TournamentStatisticsModal = NiceModal.create(() => {
  const modal = useModal(ModalCodes.tournamentStatisticsModal);

  const gameId = useSelector(gameIdSelector);
  const tournament = useSelector(tournamentSelector);
  const firstPlayer = useSelector(firstPlayerSelector);
  const secondPlayer = useSelector(secondPlayerSelector);

  const [showFullStatistics, setShowFullStatistics] = useState(false);

  const matches = useMemo(() => {
    if (showFullStatistics && setShowFullStatistics) {
      return Object.values(tournament?.matches || {});
    }

    return Object.values(tournament?.matches || {}).filter(
      ({ round }) => round === tournament.currentRound,
    );
  }, [tournament.matches, tournament.currentRound, showFullStatistics]);
  const gameRound = useMemo(() => (
    Object.values(tournament?.matches || {}).find(match => match.gameId === gameId)?.round
  ), [tournament.matches, gameId]);

  const [player, opponent] = useMatchesStatistics(firstPlayer.id, matches);

  const showTournamentStatistics = tournament.type === 'swiss'
    && secondPlayer.id === opponent.playerId
    && (tournament.breakState === 'on' || tournament.state === TournamentStateCodes.finished)
    && tournament.currentRound === gameRound;

  useEffect(() => {
    if (modal.visible) {
      NiceModal.hide(ModalCodes.gameResultModal);
      NiceModal.hide(ModalCodes.premiumRestrictionModal);
      NiceModal.hide(ModalCodes.taskDescriptionModal);
    }
  }, [modal.visible]);

  useEffect(() => {
    if (showTournamentStatistics && !modal.visible) {
      NiceModal.show(ModalCodes.tournamentStatisticsModal);
    }
  }, [modal.visible, showTournamentStatistics]);

  const title = showFullStatistics
    ? 'Tournament statistics'
    : 'Tournament round statistics';

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between">
          <div className="d-flex flex-column align-items-center p-2">
            <span className="h4 mb-2">{firstPlayer?.name}</span>
            <span className="h4 mb-2">{player.score}</span>
            <span className="h4 mb-2">{player.winMatches.length}</span>
            <span className="h4 mb-2">
              {Math.ceil(player.avgTests)}
              %
            </span>
            <span className="h4 mb-2">
              {Math.ceil(player.avgDuration)}
              {' sec'}
            </span>
          </div>
          <div className="d-flex flex-column align-items-center p-2">
            <span className="h4 mb-2">Player</span>
            <span className="h4 mb-2">Score</span>
            <span className="h4 mb-2">Wins</span>
            <span className="h4 mb-2">AVG Tests</span>
            <span className="h4 mb-2 text-nowrap">AVG Solving speed</span>
          </div>
          <div className="d-flex flex-column align-items-center p-2">
            <span className="h4 mb-2">{secondPlayer?.name}</span>
            <span className="h4 mb-2">{opponent.score}</span>
            <span className="h4 mb-2">{opponent.winMatches.length}</span>
            <span className="h4 mb-2">
              {Math.ceil(opponent.avgTests)}
              %
            </span>
            <span className="h4 mb-2">
              {Math.ceil(opponent.avgDuration)}
              {' sec'}
            </span>
          </div>
        </div>
      </Modal.Body>
      {/* <Modal.Footer>
        <div className="d-flex justify-content-end w-100">
          <Button
            onClick={toggleStatisticsMode}
            className="btn btn-success text-white rounded-lg"
          >
            <FontAwesomeIcon icon={showFullStatistics ? 'toggle-on' : 'toggle-off'} className="mr-2" />
            {showFullStatistics ? 'Open current round' : 'Open full statistics'}
          </Button>
        </div>
      </Modal.Footer>
      */}
    </Modal>
  );
});

export default memo(TournamentStatisticsModal);
