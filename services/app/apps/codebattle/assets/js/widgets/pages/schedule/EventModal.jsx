import React, {
  memo, useCallback, useEffect, useState,
} from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import cn from 'classnames';
import i18n from 'i18next';
import capitalize from 'lodash/capitalize';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useSelector } from 'react-redux';

import { currentUserIsAdminSelector } from '@/selectors';

import dayjs from '../../../i18n/dayjs';
import ModalCodes from '../../config/modalCodes';

import { grades } from './TournamentSchedule';

const getRankingPoints = grade => {
  switch (grade) {
    case grades.rookie: return [8, 4, 2];
    case grades.challenger: return [16, 8, 4, 2];
    case grades.pro: return [128, 64, 32, 16, 8, 4, 2];
    case grades.elite: return [256, 128, 64, 32, 16, 8, 4, 2];
    case grades.masters: return [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2];
    case grades.grandSlam: return [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2];
    default: return [0];
  }
};

const getTasksCount = grade => {
  switch (grade) {
    case grades.rookie: return 4;
    case grades.challenger: return 6;
    case grades.pro: return 8;
    case grades.elite: return 10;
    case grades.masters: return 12;
    case grades.grandSlam: return 14;
    default: return 0;
  }
};

const GradeInfo = ({ grade, selected }) => (
  <div className={cn('d-flex justify-content-between', { 'text-monospace': grade === selected })}>
    <span className={grade === selected ? 'text-white' : ''}>
      {capitalize(grade)}
      {grade === selected && '(*)'}
    </span>
    <span className={cn('pl-3', { 'text-white': grade === selected })}>
      [
      {getRankingPoints(grade).join(', ')}
      ]
    </span>
  </div>
);

const Timer = ({ date = new Date(), label }) => {
  const [duration, setDuration] = useState(0);
  const [stoped, setStoped] = useState(0);

  useEffect(() => {
    if (stoped) {
      return () => { };
    }

    const interval = setInterval(() => {
      setDuration(dayjs(date).diff(dayjs()));
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [date, stoped, setDuration]);

  if (stoped || duration > 1000 * 60 * 60 * 24) {
    return <></>;
  }

  if (duration < 0) {
    setStoped(true);
    return <></>;
  }

  return (
    <>
      {label}
      {' '}
      <span className="text-monospace">{dayjs.duration(duration).format('HH:mm:ss')}</span>
    </>
  );
};

export const EventModal = NiceModal.create(({ event: selectedEvent, events, clearEvent }) => {
  const [currentEvent, setCurrentEvent] = useState();
  const [prevEvent, setPrevEvent] = useState();
  const [nextEvent, setNextEvent] = useState();

  const isAdmin = useSelector(currentUserIsAdminSelector);

  const modal = useModal(ModalCodes.calendarEventModal);

  const event = currentEvent || selectedEvent;
  const isUpcoming = event?.resourse?.grade === 'upcoming';

  useEffect(() => {
    if (event) {
      const sortedEvents = events.sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));
      const eventIndex = sortedEvents.findIndex(e => e.resourse.id === event.resourse.id);

      if (eventIndex === -1) return;

      if (eventIndex < 1) {
        setPrevEvent(undefined);
      } else {
        setPrevEvent(sortedEvents[eventIndex - 1]);
      }

      if (eventIndex > events.length - 2) {
        setNextEvent(undefined);
      } else {
        setNextEvent(sortedEvents[eventIndex + 1]);
      }
    }
  }, [event, events, setPrevEvent, setNextEvent]);

  const clickPrev = useCallback(() => {
    setCurrentEvent(prevEvent);
  }, [setCurrentEvent, prevEvent]);
  const clickNext = useCallback(() => {
    setCurrentEvent(nextEvent);
  }, [setCurrentEvent, nextEvent]);
  const handleClose = useCallback(() => {
    modal.hide();
    clearEvent();
  }, [modal, clearEvent]);

  return (
    <Modal
      size="lg"
      show={modal.visible}
      onHide={modal.hide}
      contentClassName="cb-bg-highlight-panel cb-text"
    >
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title className="d-flex flex-column">
          {event.resourse.grade !== grades.open && <span className="text-white">Codebattle League 2025</span>}
          {i18n.t('Tournament: %{name}', { name: event.title })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column">
          <div className="w-100 d-flex justify-content-between p-2">
            <div className="d-flex">
              {prevEvent && (
                <div
                  role="button"
                  onClick={clickPrev}
                  onKeyPress={() => { }}
                  className="btn-link"
                  tabIndex="0"
                >
                  <span className="pr-2">{'<<'}</span>
                  {prevEvent.title}
                </div>
              )}
            </div>
            <div className="d-flex">
              {nextEvent && (
                <div
                  role="button"
                  onClick={clickNext}
                  onKeyPress={() => { }}
                  className="btn-link"
                  tabIndex="0"
                >
                  {nextEvent.title}
                  <span className="pl-2">{'>>'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="d-flex justify-content-center w-100 h-100">
            <div className="d-flex flex-column cb-bg-panel cb-rounded p-3">
              <span>{`Start Date: ${dayjs(event.start).format('MMMM DD, YYYY')}`}</span>
              <span>{`Time: ${dayjs(event.start).format('hh:mm A')} - ${dayjs(event.end).format('hh:mm A')}`}</span>
              {event.resourse.grade !== grades.open
                && <span>{`First Place Points: ${getRankingPoints(event.resourse.grade)[0]} Ranking Points`}</span>}
              <span><Timer date={event.start} label="Starts in: " /></span>
            </div>
          </div>
          <div className="d-flex flex-column align-items-center cb-rounded w-100 h-100 p-3">
            {event.resourse.grade !== grades.open ? (
              <>
                <span className="text-white">Tournament Highlights:</span>
                <div className="d-flex flex-column">
                  <span>Prizes: Codebattle T-shirt merch for a top-tier of League</span>
                  <span>{`Challenges: ${getTasksCount(event.resourse.grade)} unique algorithm problems`}</span>
                  <span>Impact: Advancing in the Codebattle programmer rankings</span>
                </div>
                <div className="d-flex justify-content-center w-100">
                  <div className="card cb-card mt-2">
                    <div className="card-header text-center">View League Ranking Points System</div>
                    <div className="card-body">
                      {[grades.rookie, grades.challenger, grades.pro, grades.elite, grades.masters, grades.grandSlam].map(grade => (
                        <GradeInfo grade={grade} selected={event.resourse.grade} />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="text-white">Tournament Description:</span>
                {event.resourse.description}
              </>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="cb-border-color">
        {event.resourse.id && (
          <a
            href={(isAdmin || !isUpcoming) ? `/tournaments/${event.resourse.id}` : 'blank'}
            className={
              cn(
                'btn btn-secondary cb-btn-secondary pr-2 cb-rounded',
                { disabled: isUpcoming },
              )
            }
            disabled={isUpcoming}
          >
            {i18n.t('Open Tournament')}
          </a>
        )}
        <Button onClick={handleClose} className="btn btn-secondary cb-btn-secondary cb-rounded">
          {i18n.t('Close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(EventModal);
