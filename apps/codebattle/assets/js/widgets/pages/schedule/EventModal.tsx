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
      <Modal size="lg" show={modal.visible} onHide={modal.hide}>
        <Modal.Header closeButton>
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
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem',
              }}
              events={events}
              event={event}
              setEvent={setCurrentEvent as (event?: { resourse: { id: number | string } }) => void}
            />
            <TournamentPreviewPanel
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
              tournament={event.resourse}
              start={event.start as string | number | Date}
              end={event.end as string | number | Date}
            />
            <TournamentDescription
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                padding: '1rem',
              }}
              tournament={event.resourse}
            />
          </Flex>
        </Modal.Body>
        <Modal.Footer>
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
