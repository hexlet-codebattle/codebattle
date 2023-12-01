import React, { memo } from 'react';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import Loading from '@/components/Loading';

import gifs from '../../config/gifs';
import { gamePlayersSelector, currentUserIdSelector } from '../../selectors';

function TournamentInfoPanel() {
  const haveNextGame = useSelector(state => state.game.haveNextGame);

  return (
    <div className="d-flex text-center justify-content-center">
      <span className="py-2">
        {haveNextGame ? (
          <div className="d-flex flex-row">
            <Loading adaptive />
            <span className="pl-2">Wait next game</span>
          </div>
        ) : (
          'Round is over'
        )}
      </span>
    </div>
  );
}

function AnimationModal({ setModalShowing, modalShowing }) {
  const players = useSelector(state => gamePlayersSelector(state));
  const currentUserId = useSelector(state => currentUserIdSelector(state));
  const tournamentsInfo = useSelector(state => state.game.tournamentInfo);
  // TODO: Сделать анимацию для спектаторов указать кто победил а кто проиграл
  // Можно сделать в виде MortalCombat
  // assigned to karen9999
  // можно сделать random из нескольких чтобы добавить веселье
  if (!players[currentUserId]) {
    return null;
  }
  const { result } = players[currentUserId];
  const titleModal = result === 'won'
      ? "Woohoo, you're Champion!!!!!"
      : "If you read this you've lost the game";
  const buttonText = result === 'won' ? 'Thanks' : "I'll be back";
  const handleCloseModal = () => {
    setModalShowing(false);
  };
  return (
    result !== 'undefined' && (
      <Modal show={modalShowing} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{titleModal}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-center">
            <img
              className="w-100 rounded-lg"
              style={{ maxWidth: '400px', height: '300px' }}
              src={gifs[result]}
              alt="animation"
            />
          </div>
          {!tournamentsInfo && (<TournamentInfoPanel />)}
        </Modal.Body>
        <Modal.Footer>
          {tournamentsInfo && (
            <a href={`/tournaments/${tournamentsInfo}`} className="btn-link pr-2 rounded-lg">
              Back to tournament
            </a>
          )}
          <Button onClick={handleCloseModal} className="btn btn-secondary rounded-lg">
            {buttonText}
          </Button>
        </Modal.Footer>
      </Modal>
    )
  );
}

export default memo(AnimationModal);
