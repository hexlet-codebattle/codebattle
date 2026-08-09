import React, { memo, useCallback, useContext, useRef, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Flex, Grid, Stack, Text } from '@mantine/core';
import cn from 'classnames';
import { useDispatch } from 'react-redux';

import Modal from '@/components/CbModal';
import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import { type AppDispatch } from '@/slices';

import i18n from '../../../i18n';
import {
  cancelTournament,
  finishTournament,
  restartTournament as handleRestartTournament,
  retryTournament as handleRetryTournament,
  finishRoundTournament as handleFinishRoundTournament,
  openUpTournament as handleOpenUpTournament,
  showTournamentResults as handleShowResults,
} from '../../middlewares/TournamentAdmin';

interface TournamentMainControlButtonsProps {
  accessType?: string;
  streamMode?: boolean;
  tournamentId: number;
  canStart?: boolean;
  canStartRound?: boolean;
  canFinishRound?: boolean;
  canFinishTournament?: boolean;
  canToggleShowBots?: boolean;
  canRestart?: boolean;
  showBots?: boolean;
  hideResults?: boolean;
  disabled?: boolean;
  toggleShowBots: () => void;
  handleStartRound: (value: any) => void;
  handleOpenDetails: () => void;
  toggleStreamMode: () => void;
}

function TournamentMainControlButtons({
  accessType,
  streamMode,
  tournamentId,
  canStart,
  canStartRound,
  canFinishRound,
  canFinishTournament,
  canToggleShowBots,
  canRestart,
  showBots,
  hideResults,
  disabled = true,
  toggleShowBots,
  handleStartRound,
  handleOpenDetails,
  toggleStreamMode,
}: TournamentMainControlButtonsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const confirmBtnRef = useRef(null);
  const hasCustomEventStyle = useContext(CustomEventStylesContext);
  const [restartConfirmationModalShowing, setRestartConfirmationModalShowing] = useState(false);
  const [retryConfirmationModalShowing, setRetryConfirmationModalShowing] = useState(false);
  const [finishConfirmationModalShowing, setFinishConfirmationModalShowing] = useState(false);

  const handleStartTournament = useCallback(() => {
    handleStartRound('firstRound');
  }, [handleStartRound]);
  const handleCancelTournament = useCallback(() => {
    dispatch(cancelTournament());
  }, [dispatch]);
  const handleStartRoundTournament = useCallback(() => {
    handleStartRound('nextRound');
  }, [handleStartRound]);
  const openRestartConfirmationModal = useCallback(() => {
    setRestartConfirmationModalShowing(true);
  }, []);
  const closeRestartConfirmationModal = useCallback(() => {
    setRestartConfirmationModalShowing(false);
  }, []);
  const confirmRestartTournament = useCallback(() => {
    handleRestartTournament();
    closeRestartConfirmationModal();
  }, [closeRestartConfirmationModal]);
  const openRetryConfirmationModal = useCallback(() => {
    setRetryConfirmationModalShowing(true);
  }, []);
  const closeRetryConfirmationModal = useCallback(() => {
    setRetryConfirmationModalShowing(false);
  }, []);
  const confirmRetryTournament = useCallback(() => {
    handleRetryTournament();
    closeRetryConfirmationModal();
  }, [closeRetryConfirmationModal]);
  const openFinishConfirmationModal = useCallback(() => {
    setFinishConfirmationModalShowing(true);
  }, []);
  const closeFinishConfirmationModal = useCallback(() => {
    setFinishConfirmationModalShowing(false);
  }, []);
  const confirmFinishTournament = useCallback(() => {
    finishTournament();
    closeFinishConfirmationModal();
  }, [closeFinishConfirmationModal]);

  const cancelBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-secondary' : undefined;
  const confirmBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-danger' : undefined;

  const customActionBtnClass = hasCustomEventStyle ? 'cb-custom-event-btn-secondary' : undefined;
  const customFlowBtnClass = hasCustomEventStyle ? 'cb-custom-event-btn-success' : undefined;
  const customSubtleBtnClass = hasCustomEventStyle ? 'cb-custom-event-btn-secondary' : undefined;
  const customDestructiveBtnClass = hasCustomEventStyle ? 'cb-custom-event-btn-danger' : undefined;

  return (
    <>
      <Modal
        show={restartConfirmationModalShowing}
        onHide={closeRestartConfirmationModal}
        contentClassName="cb-text"
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>{i18n.t('Reset tournament progress')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="cb-border-color">
          <Stack>
            <Text fw={700} size="lg">
              {i18n.t('Are you sure you want to reset this tournament?')}
            </Text>
            <Text c="dimmed">
              {i18n.t(
                'This action is destructive. All tournament progress, matches, and results will be lost.',
              )}
            </Text>
          </Stack>
        </Modal.Body>
        <Modal.Footer className="cb-border-color">
          <Flex justify="space-between" w="100%">
            <Button
              onClick={closeRestartConfirmationModal}
              color="cbSecondary"
              radius="md"
              className={cancelBtnClassName}
            >
              {i18n.t('Cancel')}
            </Button>
            <Button
              ref={confirmBtnRef}
              onClick={confirmRestartTournament}
              color="red"
              radius="md"
              className={confirmBtnClassName}
            >
              {i18n.t('Reset tournament')}
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal>
      <Modal
        show={retryConfirmationModalShowing}
        onHide={closeRetryConfirmationModal}
        contentClassName="cb-text"
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>{i18n.t('Retry tournament')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="cb-border-color">
          <Stack>
            <Text fw={700} size="lg">
              {i18n.t('Are you sure you want to retry this tournament?')}
            </Text>
            <Text c="dimmed">
              {i18n.t(
                'This will clear tournament games and results, then restore the current player roster.',
              )}
            </Text>
          </Stack>
        </Modal.Body>
        <Modal.Footer className="cb-border-color">
          <Flex justify="space-between" w="100%">
            <Button
              onClick={closeRetryConfirmationModal}
              color="cbSecondary"
              radius="md"
              className={cancelBtnClassName}
            >
              {i18n.t('Cancel')}
            </Button>
            <Button
              onClick={confirmRetryTournament}
              color="red"
              radius="md"
              className={confirmBtnClassName}
            >
              {i18n.t('Retry tournament')}
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal>
      <Modal
        show={finishConfirmationModalShowing}
        onHide={closeFinishConfirmationModal}
        contentClassName="cb-text"
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>{i18n.t('Finish tournament')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="cb-border-color">
          <Stack>
            <Text fw={700} size="lg">
              {i18n.t('Are you sure you want to finish this tournament?')}
            </Text>
            <Text c="dimmed">
              {i18n.t('This will end the tournament and finalize all results.')}
            </Text>
          </Stack>
        </Modal.Body>
        <Modal.Footer className="cb-border-color">
          <Flex justify="space-between" w="100%">
            <Button
              onClick={closeFinishConfirmationModal}
              color="cbSecondary"
              radius="md"
              className={cancelBtnClassName}
            >
              {i18n.t('Cancel')}
            </Button>
            <Button
              onClick={confirmFinishTournament}
              color="red"
              radius="md"
              className={confirmBtnClassName}
            >
              {i18n.t('Finish tournament')}
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal>
      <Flex direction="column" w="100%">
        <Grid gap="md">
          {!streamMode && (
            <Grid.Col span={{ base: 12, xl: 6 }}>
              <Text size="xs" tt="uppercase" c="dimmed" fw={700} mb="xs">
                {i18n.t('Tournament flow')}
              </Text>
              <Flex wrap="wrap" align="center" gap="xs">
                {canStartRound ? (
                  <Button
                    color="cbSuccess"
                    size="xs"
                    radius="md"
                    className={customFlowBtnClass}
                    onClick={handleStartRoundTournament}
                    disabled={!canStartRound || disabled}
                    leftSection={<FontAwesomeIcon icon="arrow-right" />}
                  >
                    {i18n.t('Start Round')}
                  </Button>
                ) : null}
                {canFinishRound ? (
                  <Button
                    color="cbSuccess"
                    size="xs"
                    radius="md"
                    className={customFlowBtnClass}
                    onClick={handleFinishRoundTournament}
                    disabled={!canFinishRound || disabled}
                    leftSection={<FontAwesomeIcon icon="flag-checkered" />}
                  >
                    {i18n.t('Finish Round')}
                  </Button>
                ) : null}
                {canFinishTournament ? (
                  <Button
                    color="cbSecondary"
                    size="xs"
                    radius="md"
                    className={customActionBtnClass}
                    onClick={openFinishConfirmationModal}
                    disabled={disabled}
                    leftSection={<FontAwesomeIcon icon="stop" />}
                  >
                    {i18n.t('Finish Tournament')}
                  </Button>
                ) : null}
                {canRestart ? (
                  <Button
                    color="cbSecondary"
                    size="xs"
                    radius="md"
                    className={customActionBtnClass}
                    onClick={openRestartConfirmationModal}
                    disabled={!canRestart || disabled}
                    leftSection={<FontAwesomeIcon icon="sync" />}
                  >
                    {i18n.t('Restart')}
                  </Button>
                ) : (
                  <Button
                    color="cbSuccess"
                    size="xs"
                    radius="md"
                    className={customFlowBtnClass}
                    onClick={handleStartTournament}
                    disabled={!canStart || disabled}
                    leftSection={<FontAwesomeIcon icon="play" />}
                  >
                    {i18n.t('Start')}
                  </Button>
                )}
                <Button
                  color="cbSecondary"
                  size="xs"
                  radius="md"
                  className={customActionBtnClass}
                  onClick={openRetryConfirmationModal}
                  disabled={disabled}
                  leftSection={<FontAwesomeIcon icon="redo" />}
                >
                  {i18n.t('Retry')}
                </Button>
                <Button
                  color="cbSecondary"
                  size="xs"
                  radius="md"
                  className={customActionBtnClass}
                  onClick={handleShowResults}
                  disabled={disabled || !hideResults}
                  leftSection={<FontAwesomeIcon icon="eye" />}
                >
                  {i18n.t('Show Results')}
                </Button>
                <Button
                  color="red"
                  size="xs"
                  radius="md"
                  className={customDestructiveBtnClass}
                  onClick={handleCancelTournament}
                  disabled={disabled}
                  leftSection={<FontAwesomeIcon icon="trash" />}
                >
                  {i18n.t('Cancel')}
                </Button>
              </Flex>
            </Grid.Col>
          )}

          <Grid.Col span={{ base: 12, xl: streamMode ? 12 : 6 }}>
            <Text size="xs" tt="uppercase" c="dimmed" fw={700} mb="xs">
              {i18n.t('Settings')}
            </Text>
            <Flex wrap="wrap" align="center" gap="xs">
              <Button
                component="a"
                href={`/tournaments/${tournamentId}/edit`}
                variant="outline"
                color="cbSecondary"
                size="xs"
                radius="md"
                className={customSubtleBtnClass}
                leftSection={<FontAwesomeIcon icon="edit" />}
              >
                {i18n.t('Edit')}
              </Button>
              <Button
                variant="outline"
                color="cbSecondary"
                size="xs"
                radius="md"
                className={customSubtleBtnClass}
                onClick={handleOpenDetails}
                leftSection={<FontAwesomeIcon icon="cog" />}
              >
                {i18n.t('Tournament details')}
              </Button>
              <Button
                variant="outline"
                color="cbSecondary"
                size="xs"
                radius="md"
                className={customSubtleBtnClass}
                onClick={toggleStreamMode}
                disabled={disabled}
                leftSection={<FontAwesomeIcon icon="video" />}
              >
                {i18n.t('Toggle stream mode')}
              </Button>
              <Button
                variant="outline"
                color="cbSecondary"
                size="xs"
                radius="md"
                className={customSubtleBtnClass}
                onClick={toggleShowBots}
                disabled={disabled || !canToggleShowBots}
                leftSection={<FontAwesomeIcon icon="robot" />}
              >
                {i18n.t(showBots ? 'Hide bots' : 'Show bots')}
              </Button>
              {accessType === 'token' && (
                <Button
                  variant="outline"
                  color="cbSecondary"
                  size="xs"
                  radius="md"
                  className={customSubtleBtnClass}
                  onClick={handleOpenUpTournament}
                  disabled={disabled}
                  leftSection={<FontAwesomeIcon icon="unlock" />}
                >
                  {i18n.t('Open up')}
                </Button>
              )}
            </Flex>
          </Grid.Col>
        </Grid>
      </Flex>
    </>
  );
}

export default memo(TournamentMainControlButtons);
