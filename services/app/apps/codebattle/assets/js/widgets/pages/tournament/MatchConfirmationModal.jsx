import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
} from 'react';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import { makeGameUrl } from '@/utils/urlBuilders';

const getOpponent = (match, playerId) => (match.playerIds[0] === playerId ? match.playerIds[1] : match.playerIds[0]);
const openNextMatch = nextMatch => {
  window.location.replace(makeGameUrl(nextMatch.gameId));
};
const begin = 105 * 1000;
const getTimerProgress = remaining => {
  if (remaining <= 0) {
    return 0;
  }

  return Math.ceil((remaining / begin) * 100);
};

function MatchConfirmationModal({ players, matches, currentUserId }) {
  const confirmBtnRef = useRef(null);

  const [remainingTime, setRemainingTime] = useState(null);
  const [modalShowing, setModalShowing] = useState(false);
  const [openMatch, setOpenMatch] = useState(false);

  const nextMatch = useMemo(
    () => Object.values(matches).find(
        match => match.state === 'playing' && match.playerIds.includes(currentUserId),
      ),
    [matches, currentUserId],
  );
  const opponentId = useMemo(
    () => (nextMatch ? getOpponent(nextMatch, currentUserId) : null),
    [nextMatch, currentUserId],
  );
  const timerProgress = getTimerProgress(remainingTime);

  const handleConfirmation = useCallback(() => {
    if (nextMatch?.gameId) {
      setOpenMatch(true);
    }
  }, [nextMatch]);

  const handleCancel = useCallback(() => {
    setModalShowing(false);
    setRemainingTime(null);
  }, []);

  useEffect(() => {
    if (modalShowing) {
      confirmBtnRef.current.focus();
    }
  }, [modalShowing]);

  useEffect(() => {
    if (nextMatch?.gameId && !modalShowing) {
      setModalShowing(true);
    }

    if (!nextMatch?.gameId) {
      setModalShowing(false);
    }

    if (nextMatch?.gameId) {
      const timerId = window.setInterval(() => {
        setRemainingTime(time => {
          if (time === null) {
            return begin;
          }

          if (time + 2 * 100 <= 0) {
            setOpenMatch(true);
            window.clearInterval(timerId);

            return null;
          }

          return time - 100;
        });
      }, 100);

      return () => {
        setRemainingTime(null);
        window.clearInterval(timerId);
      };
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMatch?.gameId]);

  useEffect(() => {
    if (openMatch && (!nextMatch?.gameId || !modalShowing)) {
      setOpenMatch(false);
      return;
    }

    if (openMatch) {
      openNextMatch(nextMatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMatch]);

  const title = 'Next match will be oppened. Show now?';

  return (
    <Modal show={modalShowing} onHide={handleCancel}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {opponentId && (
          <span className="d-flex justify-content-center text-center mb-2">{`Your opponent is waiting: ${players[opponentId]?.name}`}</span>
        )}
        {remainingTime !== null && (
          <div className="progress mx-5">
            <div
              aria-label="Countdown before redirect to the next match"
              style={{ width: `${timerProgress}%` }}
              className="progress-bar"
              role="progressbar"
              aria-valuenow={timerProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <Button
            onClick={handleCancel}
            className="btn btn-secondary rounded-lg"
          >
            Cancel
          </Button>
          <div className="d-flex">
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              className="btn btn-primary text-white rounded-lg"
            >
              Open
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(MatchConfirmationModal);
