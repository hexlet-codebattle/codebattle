import React, { useCallback, useEffect, useState } from 'react';

import NiceModal from '@ebay/nice-modal-react';
import cn from 'classnames';
import uniqBy from 'lodash/uniqBy';
import { Calendar as BigCalendar, dayjsLocalizer } from 'react-big-calendar';
import { useSelector } from 'react-redux';

import { grades } from '@/config/grades';
import ModalCodes from '@/config/modalCodes';
import { uploadTournamentsByFilter } from '@/middlewares/Tournament';
import { currentUserIdSelector, currentUserIsAdminSelector } from '@/selectors';
import useTournamentScheduleModals from '@/utils/useTournamentScheduleModals';

import dayjs from '../../../i18n/dayjs';

import ScheduleLegend, { states } from './ScheduleLegend';

const views = {
  month: 'month',
  week: 'week',
  day: 'day',
  agenda: 'agenda',
};

const haveSeasonGrade = t => t.grade !== grades.open;
const filterMyTournaments = userId => t => t.ownerId === userId;

const getEndOffsetParams = t => {
  if (t.finished && t.lastRoundEndedAt) {
    const begin = dayjs(t.startsAt);
    const end = dayjs(t.lastRoundEndedAt);
    const diff = begin.diff(end, 'millisecond');

    return [diff, 'millisecond'];
  }

  if (t.grade === grades.rookie) {
    return [15, 'minute'];
  }

  return [1, 'hour'];
};

const getEventFromTournamentData = t => ({
  title: t.name,
  start: dayjs(t.startsAt).toDate(),
  end: dayjs(t.startsAt)
    .add(...getEndOffsetParams(t))
    .toDate(),
  resourse: {
    ...t,
  },
});

const stateList = Object.values(states);

const getStateFromHash = () => {
  const { hash } = window.location;

  if (stateList.includes(hash)) {
    return hash;
  }

  return states.contest;
};

// const eventPropGetter = (event, _start, _end, _isSelected) => ({
const eventPropGetter = event => ({
  className: cn('cb-rbc-event', {
    'cb-rbc-open-event': event?.resourse?.grade === grades.open,
    'cb-rbc-rookie-event': event?.resourse?.grade === grades.rookie,
    'cb-rbc-challenger-event': event?.resourse?.grade === grades.challenger,
    'cb-rbc-pro-event': event?.resourse?.grade === grades.pro,
    'cb-rbc-masters-event': event?.resourse?.grade === grades.masters,
    'cb-rbc-elite-event': event?.resourse?.grade === grades.elite,
    'cb-rbc-grand-slam-event': event?.resourse?.grade === grades.grandSlam,
  }),
});

const checkNeedLoading = (oldData, newDate) => {
  const oldBeginMonth = dayjs(oldData).startOf('month');
  const newBeginMonth = dayjs(newDate).startOf('month');

  const result = oldBeginMonth.diff(newBeginMonth, 'month');
  return result !== 0;
};

const TournamentSchedule = () => {
  const [event, setSelectedEvent] = useState(null);
  const [context, setContext] = useState(getStateFromHash);
  const [tournaments, setTournaments] = useState({
    seasonTournaments: [],
    userTournaments: [],
    loading: true,
  });
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState(dayjs().format());
  const [view, setView] = useState(views.month);
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const currentUserId = useSelector(currentUserIdSelector);

  useTournamentScheduleModals();

  const codebattleLocalizer = dayjsLocalizer(dayjs);

  const loadTournaments = async (_abortController, newDate = date) => {
    const beginMonth = dayjs(newDate).startOf('month').toISOString();
    const endMonth = dayjs(newDate).endOf('month').toISOString();

    const [seasonTournaments, userTournaments] = await uploadTournamentsByFilter(beginMonth, endMonth);
    setTournaments({ seasonTournaments, userTournaments, loading: false });
  };

  const onView = useCallback(
    v => {
      setView(v);
    },
    [setView],
  );

  const onChangeContext = e => {
    e.preventDefault();

    try {
      if (
        e.currentTarget.dataset.context
        && stateList.includes(e.currentTarget.dataset.context)
      ) {
        const { context: newContext } = e.currentTarget.dataset;
        window.location.hash = newContext;
        setContext(newContext);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onNavigate = newDate => {
    if (checkNeedLoading(date, newDate)) {
      const abortController = new AbortController();
      setTournaments(state => ({ ...state, loading: true }));
      setEvents([]);
      loadTournaments(abortController, newDate).catch(e => {
        console.error(e);
        setDate(date);
      });
    }

    setDate(newDate);
  };

  useEffect(() => {
    const abortController = new AbortController();
    loadTournaments(abortController);
    /* eslint-disable-next-line */
  }, []);

  useEffect(() => {
    if (!isAdmin && context === states.all) {
      setContext(states.contest);
      window.location.hash = states.contest;
      return;
    }

    if (tournaments.loading) {
      setEvents([]);
      return;
    }

    if (context === states.contest) {
      const newEvents = uniqBy([
        ...tournaments.seasonTournaments,
        ...tournaments.userTournaments.filter(haveSeasonGrade),
      ], 'id').map(getEventFromTournamentData);

      setEvents(newEvents);
    } else if (context === states.my) {
      const newEvents = tournaments.userTournaments
        .filter(filterMyTournaments(currentUserId))
        .map(getEventFromTournamentData);

      setEvents(newEvents);
    } else if (context === states.all) {
      const newEvents = uniqBy([
        ...tournaments.seasonTournaments,
        ...tournaments.userTournaments,
      ], 'id').map(getEventFromTournamentData);

      setEvents(newEvents);
    }
  }, [context, currentUserId, tournaments, isAdmin]);

  useEffect(() => {
    if (event) {
      NiceModal.show(ModalCodes.calendarEventModal, { event, events, clearEvent: setSelectedEvent });
    }
    /* eslint-disable-next-line */
  }, [event, setSelectedEvent]);

  return (
    <div
      className="d-flex flex-column h-100 w-100 cb-bg-panel cb-rounded p-1 p-md-3 p-lg-3 position-relative cb-overflow-y-scroll"
      style={{ maxHeight: '90vh' }}
    >
      <ScheduleLegend
        context={context}
        loading={tournaments.loading}
        onChangeContext={onChangeContext}
      />
      <BigCalendar
        localizer={codebattleLocalizer}
        startAccessor="start"
        endAccessor="end"
        // events={view === views.month ? filteredEvents : events}
        events={events}
        view={view}
        onView={onView}
        date={date}
        defaultDate={date}
        onNavigate={onNavigate}
        onSelectEvent={setSelectedEvent}
        popup
        style={{
          minHeight: '400px',
          height: '100%',
        }}
        views={[views.month, views.day, views.agenda]}
        eventPropGetter={eventPropGetter}
        className="cb-rbc-calendar"
        formats={{
          monthHeaderFormat: 'MMMM YYYY',
          dayHeaderFormat: 'dddd MMMM DD',
        }}
      />
    </div>
  );
};

export default TournamentSchedule;
