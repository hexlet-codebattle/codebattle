import React, {
  useCallback,
  useMemo,
  memo,
} from 'react';

import omit from 'lodash/omit';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

function DetailsModal({
  tournament,
  modalShowing,
  setModalShowing,
}) {
  const tournamentDetailsStr = useMemo(
    () => JSON.stringify(
      omit(
        tournament,
        [
          'players',
          'matches',
          'insertedAt',
          'updatedAt',
          'module',
          'currentRoundPosition',
          'description',
          'channel',
          'currentPlayerId',
          'topPlayerIds',
        ],
      ),
      null, 2,
    ),
    [tournament],
  );

  const handleCancel = useCallback(
    () => setModalShowing(false),
    [setModalShowing],
  );

  return (
    <Modal show={modalShowing} onHide={handleCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Tournament details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <pre className="bg-light rounded-lg p-3">{tournamentDetailsStr}</pre>
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={handleCancel}
          className="btn btn-secondary rounded-lg"
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(DetailsModal);
