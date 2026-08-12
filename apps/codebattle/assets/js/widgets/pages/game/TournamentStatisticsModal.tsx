import React, { useEffect, memo, useMemo, useState } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { Group, Stack, Text } from '@mantine/core';
import { useSelector } from 'react-redux';

import Modal from '@/components/CbModal';
import {
  tournamentSelector,
  firstPlayerSelector,
  secondPlayerSelector,
  gameIdSelector,
} from '@/selectors';
import useMatchesStatistics from '@/utils/useMatchesStatistics';

import i18n from '../../../i18n';
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
    if (showFullStatistics && Boolean(setShowFullStatistics)) {
      return Object.values(tournament?.matches || {});
    }

    return Object.values(tournament?.matches || {}).filter(
      ({ roundPosition }) => roundPosition === tournament.currentRoundPosition,
    );
  }, [tournament.matches, tournament.currentRoundPosition, showFullStatistics]);
  const gameRound = useMemo(
    () => Object.values(tournament?.matches || {}).find((match) => match.gameId === gameId)?.round,
    [tournament.matches, gameId],
  );

  const [player, opponent] = useMatchesStatistics(
    firstPlayer?.id as number,
    matches as unknown as Parameters<typeof useMatchesStatistics>[1],
  );

  const showTournamentStatistics =
    tournament.type === 'swiss' &&
    secondPlayer?.id === opponent.playerId &&
    (tournament.breakState === 'on' || tournament.state === TournamentStateCodes.finished) &&
    tournament.currentRoundPosition === gameRound;

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

  const title = i18n.t(
    showFullStatistics ? 'Tournament statistics' : 'Tournament round statistics',
  );

  return (
    <Modal centered show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Group justify="space-between" align="flex-start">
          <Stack align="center" p="sm">
            <Text fz="h4" mb="sm">
              {firstPlayer?.name}
            </Text>
            <Text fz="h4" mb="sm">
              {player.winMatches.length}
            </Text>
            <Text fz="h4" mb="sm">
              {Math.ceil(player.avgTests)}%
            </Text>
            <Text fz="h4" mb="sm">
              {Math.ceil(player.avgDuration)}
              {` ${i18n.t('sec')}`}
            </Text>
          </Stack>
          <Stack align="center" p="sm">
            <Text fz="h4" mb="sm">
              {i18n.t('Player')}
            </Text>
            <Text fz="h4" mb="sm">
              {i18n.t('Wins')}
            </Text>
            <Text fz="h4" mb="sm">
              {i18n.t('AVG Tests')}
            </Text>
            <Text fz="h4" mb="sm" style={{ whiteSpace: 'nowrap' }}>
              {i18n.t('AVG Solving speed')}
            </Text>
          </Stack>
          <Stack align="center" p="sm">
            <Text fz="h4" mb="sm">
              {secondPlayer?.name}
            </Text>
            <Text fz="h4" mb="sm">
              {opponent.winMatches.length}
            </Text>
            <Text fz="h4" mb="sm">
              {Math.ceil(opponent.avgTests)}%
            </Text>
            <Text fz="h4" mb="sm">
              {Math.ceil(opponent.avgDuration)}
              {` ${i18n.t('sec')}`}
            </Text>
          </Stack>
        </Group>
      </Modal.Body>
    </Modal>
  );
});

export default memo(TournamentStatisticsModal);
