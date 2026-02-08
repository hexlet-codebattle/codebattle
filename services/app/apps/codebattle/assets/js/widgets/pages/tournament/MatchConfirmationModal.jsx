import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
  useContext,
} from 'react';

import cn from 'classnames';
import Button from 'react-bootstrap/Button';

import Modal from '@/components/BootstrapModal';
import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import getOpponentId from '@/utils/matches';
import { makeGameUrl } from '@/utils/urlBuilders';

import i18next from '../../../i18n';

const openNextMatch = (nextMatch) => {
  window.location.replace(makeGameUrl(nextMatch.gameId));
};
const begin = 15 * 1000;
const getTimerProgress = (remaining) => {
  if (remaining <= 0) {
    return 0;
  }

  return Math.ceil((remaining / begin) * 100);
};

function MatchConfirmationModal({
  players,
  matches,
  currentUserId,
  currentRoundPosition,
  modalShowing,
  setModalShowing,
  redirectImmediatly = false,
}) {
  const confirmBtnRef = useRef(null);

  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const [remainingTime, setRemainingTime] = useState(null);
  const [openMatch, setOpenMatch] = useState(false);

  const nextMatch = useMemo(
    () => Object.values(matches)
      .sort((a, b) => b.id - a.id)
      .find(
        (match) => match.state === 'playing'
          && match.playerIds.includes(currentUserId)
          && currentRoundPosition === match.roundPosition,
      ),
    [matches, currentUserId, currentRoundPosition],
  );
  const opponentId = useMemo(
    () => (nextMatch ? getOpponentId(nextMatch, currentUserId) : null),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modalShowing) {
      confirmBtnRef.current.focus();
    }
  }, [modalShowing]);

  useEffect(() => {
    if (nextMatch?.gameId && !modalShowing && redirectImmediatly) {
      openNextMatch(nextMatch);
      return () => { };
    }

    if (nextMatch?.gameId && !modalShowing) {
      setModalShowing(true);
    }

    if (!nextMatch?.gameId) {
      setModalShowing(false);
    }

    if (nextMatch?.gameId && !redirectImmediatly) {
      const timerId = window.setInterval(() => {
        setRemainingTime((time) => {
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

    return () => { };
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

  const title = i18next.t('Next match will be opened. Show now?');
  const closeBtnClassName = cn('btn cb-rounded', {
    'btn-secondary cb-btn-secondary': !hasCustomEventStyles,
    'cb-custom-event-btn-info': hasCustomEventStyles,
  });
  const openBtnClassName = cn('btn cb-rounded', {
    'btn-secondary cb-btn-secondary': !hasCustomEventStyles,
    'cb-custom-event-btn-primary': hasCustomEventStyles,
  });

  return (
    <Modal
      contentClassName="cb-bg-panel cb-text cb-match-confirmation-modal"
      show={modalShowing}
      onHide={handleCancel}
    >
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {opponentId && (
          <span className="d-flex justify-content-center text-center mb-2">
            {i18next.t(
              'Your opponent is waiting: %{name}',
              { name: players[opponentId]?.name },
            )}
          </span>
        )}
        {remainingTime !== null && (
          <div className="progress mx-5 cb-match-confirmation-progress">
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
      <Modal.Footer className="cb-border-color">
        <div className="d-flex justify-content-between w-100">
          <Button
            onClick={handleCancel}
            className={closeBtnClassName}
          >
            {i18next.t('Cancel')}
          </Button>
          <div className="d-flex">
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              className={openBtnClassName}
            >
              {i18next.t('Open')}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(MatchConfirmationModal);
