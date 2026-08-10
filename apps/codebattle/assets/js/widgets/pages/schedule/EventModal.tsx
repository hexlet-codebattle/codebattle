import React, { memo, useCallback, useState } from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { Button, Flex, Stack, Text } from '@mantine/core';
import { useSelector } from 'react-redux';

import Modal from '@/components/CbModal';
import ScheduleNavigationTab from '@/components/ScheduleNavigationBar';
import TournamentDescription from '@/components/TournamentDescription';
import TournamentPreviewPanel from '@/components/TournamentPreviewPanel';
import { grades } from '@/config/grades';
import ModalCodes from '@/config/modalCodes';
import { currentUserIsAdminSelector } from '@/selectors';

import i18n from '../../../i18n';
import { localizeTournamentName } from '../../utils/localizeTournamentName';

interface CalendarEventResource {
  id: number | string;
  grade: string;
  description?: string;
  [key: string]: unknown;
}

interface CalendarEvent {
  title?: string;
  start?: string | number | Date;
  end?: string | number | Date;
  resourse: CalendarEventResource;
}

interface EventModalProps {
  event: CalendarEvent;
  events: CalendarEvent[];
  clearEvent: (event?: CalendarEvent | null) => void;
}

export const EventModal = NiceModal.create(
  ({ event: selectedEvent, events, clearEvent }: EventModalProps) => {
    const [currentEvent, setCurrentEvent] = useState<CalendarEvent>();

    const isAdmin = useSelector(currentUserIsAdminSelector);

    const modal = useModal(ModalCodes.calendarEventModal);

    const event = currentEvent || selectedEvent;
    const isUpcoming = event?.resourse?.grade === 'upcoming';
    const eventTitle = localizeTournamentName(event.title, event.resourse.grade);
    const handleClose = useCallback(() => {
      modal.hide();
      clearEvent();
    }, [modal, clearEvent]);

    return (
      <Modal size="lg" show={modal.visible} onHide={modal.hide} contentClassName="cb-text">
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>
            <Stack gap={0}>
              {event.resourse.grade !== grades.open && (
                <Text c="white">Codebattle League 2025</Text>
              )}
              {i18n.t('Tournament: %{name}', { name: eventTitle })}
            </Stack>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column">
            <ScheduleNavigationTab
              className="w-100 d-flex justify-content-between p-2"
              events={events}
              event={event}
              setEvent={setCurrentEvent as (event?: { resourse: { id: number | string } }) => void}
            />
            <TournamentPreviewPanel
              className="d-flex justify-content-center w-100 h-100"
              tournament={event.resourse}
              start={event.start as string | number | Date}
              end={event.end as string | number | Date}
            />
            <TournamentDescription
              className="d-flex flex-column align-items-center cb-rounded w-100 h-100 p-3"
              tournament={event.resourse}
            />
          </Flex>
        </Modal.Body>
        <Modal.Footer className="cb-border-color">
          {event.resourse.id && (
            <Button
              component="a"
              href={isAdmin || !isUpcoming ? `/tournaments/${event.resourse.id}` : 'blank'}
              color="cbSecondary"
              radius="md"
              pr="xs"
              disabled={isUpcoming}
            >
              {i18n.t('Open Tournament')}
            </Button>
          )}
          <Button onClick={handleClose} color="cbSecondary" radius="md">
            {i18n.t('Close')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  },
);

export default memo(EventModal);
