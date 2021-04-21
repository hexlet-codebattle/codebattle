import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { gamePlayersSelector, currentUserIdSelector } from '../selectors';
import gifs from '../config/gifs';

const AnimationModal = ({ setModalShowing, modalShowing }) => {
  const players = useSelector(state => gamePlayersSelector(state));
  const currentUserId = useSelector(state => currentUserIdSelector(state));
  // TODO: Сделать анимацию для спектаторов указать кто победил а кто проиграл
  // Можно сделать в виде MortalCombat
  // assigned to karen9999
  // можно сделать random из нескольких чтобы добавить веселье
  if (!players[currentUserId]) {
    return null;
  }
  const { gameResult } = players[currentUserId];
  const titleModal = gameResult === 'won'
      ? "Woohoo, you're Champion!!!!!"
      : "If you read this you've lost the game";
  const buttonText = gameResult === 'won' ? 'Thanks' : "I'll be back";
  const handleCloseModal = () => {
    setModalShowing(false);
  };
  return (
    gameResult !== 'undefined' && (
      <Modal show={modalShowing} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{titleModal}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <img
            style={{ width: '400px', marginLeft: '30px', height: '300px' }}
            src={gifs[gameResult]}
            alt="animation"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleCloseModal} className="btn btn-secondary">
            {buttonText}
          </Button>
        </Modal.Footer>
      </Modal>
    )
  );
};

export default AnimationModal;
