import React, { useCallback, useEffect, useState } from 'react';

import cn from 'classnames';
import dayjs from 'dayjs';
import uniqBy from 'lodash/uniqBy';
import { Calendar as BigCalendar, dayjsLocalizer } from 'react-big-calendar';
import { useSelector } from 'react-redux';

import { uploadTournamentsByFilter } from '@/middlewares/Tournament';
import { currentUserIsAdminSelector } from '@/selectors';

import tournamentStates from '../../config/tournament';

// const filterRookieGrade = e => !(e.resourse.grade === 'rookie' && e.resourse.state === tournamentStates.upcoming);
const haveGrade = t => !!t.grade;

const getEndOffsetParams = t => {
  if (t.finished && t.lastRoundEndedAt) {
    const begin = dayjs(t.startsAt);
    const end = dayjs(t.lastRoundEndedAt);
    const diff = begin.diff(end, 'millisecond');

    return [diff, 'millisecond'];
  }

  if (t.grade === 'rookie') {
    return [15, 'minute'];
  }

  return [1, 'hour'];
};

const getEventFromTournamentData = t => ({
  title: t.name,
  start: dayjs(t.startsAt).toDate(),
  end: dayjs(t.startsAt).add(...getEndOffsetParams(t)).toDate(),
  resourse: {
    id: t.id,
    state: t.state,
    grade: t.grade,
  },
});

const states = {
  contest: '#contest',
  my: '#my',
  all: '#all',
};

const views = {
  month: 'month',
  week: 'week',
  day: 'day',
  agenda: 'agenda',
};

const stateList = Object.values(states);

const getStateFromHash = () => {
  const { hash } = window.location;

  if (stateList.includes(hash)) {
    return hash;
  }

  return states.contest;
};

const eventPropGetter = (event, _start, _end, _isSelected) => ({
  className: cn('cb-rbc-event', {
    'cb-rbc-live-event': [
      tournamentStates.active,
      tournamentStates.waitingParticipants,
      tournamentStates.loading,
    ].includes(event?.resourse?.state),
    'cb-rbc-upcoming-event': event?.resourse?.state === tournamentStates.upcoming,
    'cb-rbc-canceled-event': event?.resourse?.state === tournamentStates.canceled,
    'cb-rbc-finished-event': event?.resourse?.state === tournamentStates.finished,
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
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState(dayjs().format());
  const [view, setView] = useState(views.month);
  const isAdmin = useSelector(currentUserIsAdminSelector);

  const sectionBtnClassName = cn('btn btn-secondary border-0 cb-btn-secondary cb-rounded');

  const codebattleLocalizer = dayjsLocalizer(dayjs);

  const loadTournaments = async (_abortController, newDate = date) => {
    const beginMonth = dayjs(newDate).startOf('month').toISOString();
    const endMonth = dayjs(newDate).endOf('month').toISOString();

    if (context === states.contest) {
      uploadTournamentsByFilter(beginMonth, endMonth)
        .then(([upcomingTournaments, userTournaments]) => {
          const newTournaments = [...upcomingTournaments, ...userTournaments.filter(haveGrade)];
          setTournaments(uniqBy(newTournaments, 'id'));
        });
    } else if (context === states.my) {
      uploadTournamentsByFilter(beginMonth, endMonth)
        .then(([, userTournaments]) => {
          setTournaments(userTournaments);
        });
    } else if (context === states.all) {
      uploadTournamentsByFilter(beginMonth, endMonth)
        .then(([upcomingTournaments, userTournaments]) => {
          const newTournaments = [...upcomingTournaments, ...userTournaments.filter(haveGrade)];
          setTournaments(uniqBy(newTournaments, 'id'));
        });
    }
  };

  const onView = useCallback(v => {
    setView(v);
  }, [setView]);

  const onChangeContext = e => {
    e.preventDefault();

    try {
      if (e.currentTarget.dataset.context && stateList.includes(e.currentTarget.dataset.context)) {
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
      loadTournaments(abortController, newDate);
    }

    setDate(newDate);
  };

  useEffect(() => {
    if (!isAdmin && context === states.all) {
      setContext(states.contest);
      window.location.hash = states.contest;
      return () => { };
    }

    const abortController = new AbortController();

    loadTournaments(abortController);

    return () => abortController.abort();
  }, [context]);

  useEffect(() => {
    if (tournaments) {
      setEvents(tournaments.map(getEventFromTournamentData));
    }
  }, [tournaments]);

  useEffect(() => {
    if (event?.resourse && event?.resourse?.state !== tournamentStates.upcoming) {
      window.location.href = `/tournaments/${event.resourse.id}`;
    }
  }, [event]);

  // const filteredEvents = events.filter(filterRookieGrade);

  return (
    <div
      className="d-flex flex-column h-100 w-100 cb-bg-panel cb-rounded p-1 p-md-3 p-lg-3 position-relative cb-overflow-y-scroll"
      style={{ maxHeight: '90vh' }}
    >
      <div className="d-flex btn-group align-items-center justify-content-center p-1 pb-4">
        <button
          type="button"
          className={cn(sectionBtnClassName, { active: context === states.contest })}
          data-context={states.contest}
          onClick={onChangeContext}
        >
          Contests History
        </button>
        <button
          type="button"
          className={cn(sectionBtnClassName, { active: context === states.my })}
          data-context={states.my}
          onClick={onChangeContext}
        >
          My Tournaments
        </button>
        {isAdmin && (
          <button
            type="button"
            className={cn(sectionBtnClassName, { active: context === states.all })}
            data-context={states.all}
            onClick={onChangeContext}
          >
            All Tournaments
          </button>
        )}
      </div>
      <BigCalendar
        localizer={codebattleLocalizer}
        startAccessor="start"
        endAccessor="end"
        // events={view === views.month ? filteredEvents : events}
        events={events}
        view={view}
        onView={onView}
        date={date}
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
