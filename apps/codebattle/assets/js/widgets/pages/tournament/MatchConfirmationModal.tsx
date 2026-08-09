import React, { useState, useCallback, useRef, useEffect, useMemo, memo, useContext } from 'react';

import { Button, Flex, Progress, Text } from '@mantine/core';

import Modal from '@/components/CbModal';
import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import getOpponentId from '@/utils/matches';
import { makeGameUrl } from '@/utils/urlBuilders';

import { type Player } from '@/slices/initial';

import i18next from '../../../i18n';

interface Match {
  id: number;
  gameId: number;
  state: string;
  playerIds: number[];
  roundPosition: number;
  [key: string]: unknown;
}

const openNextMatch = (nextMatch: Match) => {
  window.location.replace(makeGameUrl(nextMatch.gameId));
};
const begin = 15 * 1000;
const getTimerProgress = (remaining: number | null) => {
  if (remaining === null || remaining <= 0) {
    return 0;
  }

  return Math.ceil((remaining / begin) * 100);
};

interface MatchConfirmationModalProps {
  players: Record<number, Player>;
  matches: Record<number, Match>;
  currentUserId: number;
  currentRoundPosition: number;
  modalShowing: boolean;
  setModalShowing: (showing: boolean) => void;
  redirectImmediatly?: boolean;
}

function MatchConfirmationModal({
  players,
  matches,
  currentUserId,
  currentRoundPosition,
  modalShowing,
  setModalShowing,
  redirectImmediatly = false,
}: MatchConfirmationModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [openMatch, setOpenMatch] = useState(false);

  const nextMatch = useMemo(
    () =>
      Object.values(matches)
        .sort((a, b) => b.id - a.id)
        .find(
          (match) =>
            match.state === 'playing' &&
            match.playerIds.includes(currentUserId) &&
            currentRoundPosition === match.roundPosition,
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
      confirmBtnRef.current!.focus();
    }
  }, [modalShowing]);

  useEffect(() => {
    if (nextMatch?.gameId && !modalShowing && redirectImmediatly) {
      openNextMatch(nextMatch);
      return () => {};
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

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMatch?.gameId]);

  useEffect(() => {
    if (openMatch && (!nextMatch?.gameId || !modalShowing)) {
      setOpenMatch(false);
      return;
    }

    if (openMatch && nextMatch) {
      openNextMatch(nextMatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMatch]);

  const title = i18next.t('Next match will be opened. Show now?');
  const closeBtnClassName = hasCustomEventStyles ? 'cb-custom-event-btn-info' : undefined;
  const openBtnClassName = hasCustomEventStyles ? 'cb-custom-event-btn-primary' : undefined;

  return (
    <Modal
      contentClassName="cb-text cb-match-confirmation-modal"
      show={modalShowing}
      onHide={handleCancel}
    >
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {opponentId && (
          <Text ta="center" mb="sm">
            {i18next.t('Your opponent is waiting: %{name}', { name: players[opponentId]?.name })}
          </Text>
        )}
        {remainingTime !== null && (
          <Progress
            value={timerProgress}
            mx="xl"
            aria-label={i18next.t('Countdown before redirect to the next match')}
          />
        )}
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        <Flex justify="space-between" w="100%">
          <Button
            onClick={handleCancel}
            color="cbSecondary"
            radius="md"
            className={closeBtnClassName}
          >
            {i18next.t('Cancel')}
          </Button>
          <Flex>
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              color="cbSecondary"
              radius="md"
              className={openBtnClassName}
            >
              {i18next.t('Open')}
            </Button>
          </Flex>
        </Flex>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(MatchConfirmationModal);
