import React, { memo } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { Button, Flex, Text, Title } from '@mantine/core';
import { useSelector } from 'react-redux';

import Modal from '@/components/CbModal';
import TournamentDescription from '@/components/TournamentDescription';
import TournamentPreviewPanel from '@/components/TournamentPreviewPanel';
import { grades } from '@/config/grades';
import ModalCodes from '@/config/modalCodes';
import { currentUserIsAdminSelector } from '@/selectors';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';
import { localizeTournamentName } from '../../utils/localizeTournamentName';

import { type LobbyTournament } from './TournamentCard';

interface TournamentModalProps {
  tournament: LobbyTournament;
}

export const TournamentModal = NiceModal.create(({ tournament }: TournamentModalProps) => {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  const modal = useModal(ModalCodes.tournamentModal);

  const isUpcoming = tournament?.grade === 'upcoming';
  const start = dayjs(tournament.startsAt).toDate();
  const end = dayjs(tournament.startsAt).add(1, 'hour').toDate();

  if (!tournament) {
    return <></>;
  }

  return (
    <Modal size="lg" show={modal.visible} onHide={modal.hide} contentClassName="cb-text">
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>
          {tournament.grade !== grades.open && (
            <Text component="span" c="white">
              Codebattle League 2025
            </Text>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ position: 'relative' }}>
        <Title order={3} ta="center">
          {i18n.t('Tournament: %{name}', {
            name: localizeTournamentName(tournament.name, tournament.grade),
          })}
        </Title>
        <Flex direction="column">
          <TournamentPreviewPanel
            className="d-flex justify-content-center w-100 h-100"
            tournament={tournament as unknown as { grade: string }}
            start={start}
            end={end}
          />
          <TournamentDescription
            className="d-flex flex-column align-items-center cb-rounded w-100 h-100 p-3"
            tournament={tournament as unknown as { grade: string; description?: string }}
          />
        </Flex>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        {tournament.id && (
          <Button
            component="a"
            color="cbSecondary"
            disabled={isUpcoming}
            href={isAdmin || !isUpcoming ? `/tournaments/${tournament.id}` : 'blank'}
          >
            {i18n.t('Open Tournament')}
          </Button>
        )}
        <Button onClick={modal.hide} color="cbSecondary" radius="md">
          {i18n.t('Close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(TournamentModal);
