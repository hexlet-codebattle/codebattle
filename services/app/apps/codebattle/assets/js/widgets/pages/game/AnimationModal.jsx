import React, { memo } from 'react';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import gifs from '../../config/gifs';
import { gamePlayersSelector, currentUserIdSelector } from '../../selectors';

function AnimationModal({ modalShowing, setModalShowing }) {
  const players = useSelector((state) => gamePlayersSelector(state));
  const currentUserId = useSelector((state) => currentUserIdSelector(state));
  // TODO: Сделать анимацию для спектаторов указать кто победил а кто проиграл
  // Можно сделать в виде MortalCombat
  // assigned to karen9999
  // можно сделать random из нескольких чтобы добавить веселье
  if (!players[currentUserId]) {
    return null;
  }
  const { result } = players[currentUserId];
  const titleModal =
    result === 'won' ? "Woohoo, you're Champion!!!!!" : "If you read this you've lost the game";
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
              alt="animation"
              className="w-100 rounded-lg"
              src={gifs[result]}
              style={{ maxWidth: '400px', height: '300px' }}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button className="btn btn-secondary rounded-lg" onClick={handleCloseModal}>
            {buttonText}
          </Button>
        </Modal.Footer>
      </Modal>
    )
  );
}

export default memo(AnimationModal);
