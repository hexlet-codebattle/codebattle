import React, { useCallback, useEffect, useState } from 'react';

import cn from 'classnames';
import dayjs from 'dayjs';
import { Calendar as BigCalendar, dayjsLocalizer } from 'react-big-calendar';
import { useSelector } from 'react-redux';

import { uploadTournamentsByFilter } from '@/middlewares/Tournament';
import { currentUserIdSelector, currentUserIsAdminSelector } from '@/selectors';

import tournamentStates from '../../config/tournament';

const grades = {
  open: 'open',
  rookie: 'rookie',
  challenger: 'challenger',
  pro: 'pro',
  elite: 'elite',
  masters: 'masters',
  grandSlam: 'grand_slam',
};

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

// const filterRookieGrade = e => !(e.resourse.grade === 'rookie' && e.resourse.state === tournamentStates.upcoming);
const haveSeasonGrade = t => t.grade !== grades.open;
const filterMyTournaments = userId => t => t.ownerId === userId;

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
  const [hash, setHash] = useState({ upcomingTournaments: [], userTournaments: [], loading: true });
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState(dayjs().format());
  const [view, setView] = useState(views.month);
  const isAdmin = useSelector(currentUserIsAdminSelector);
  const currentUserId = useSelector(currentUserIdSelector);

  const sectionBtnClassName = cn('btn btn-secondary border-0 cb-btn-secondary cb-rounded mx-2');

  const codebattleLocalizer = dayjsLocalizer(dayjs);

  const loadTournaments = async (_abortController, newDate = date) => {
    const beginMonth = dayjs(newDate).startOf('month').toISOString();
    const endMonth = dayjs(newDate).endOf('month').toISOString();

    const [upcomingTournaments, userTournaments] = await uploadTournamentsByFilter(beginMonth, endMonth);
    setHash({ upcomingTournaments, userTournaments, loading: false });
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
      setHash(state => ({ ...state, loading: true }));
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

    if (context === states.contest) {
      const newTournaments = [...hash.upcomingTournaments, ...hash.userTournaments.filter(haveSeasonGrade)];
      setTournaments(newTournaments);
    } else if (context === states.my) {
      setTournaments(hash.userTournaments.filter(filterMyTournaments(currentUserId)));
    } else if (context === states.all) {
      const newTournaments = [...hash.upcomingTournaments, ...hash.userTournaments];
      setTournaments(newTournaments);
    }
  }, [context, hash, setTournaments, currentUserId, isAdmin]);

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
          disabled={hash.loading}
        >
          Contests History
        </button>
        <button
          type="button"
          className={cn(sectionBtnClassName, { active: context === states.my })}
          data-context={states.my}
          onClick={onChangeContext}
          disabled={hash.loading}
        >
          My Tournaments
        </button>
        {isAdmin && (
          <button
            type="button"
            className={cn(sectionBtnClassName, { active: context === states.all })}
            data-context={states.all}
            onClick={onChangeContext}
            disabled={hash.loading}
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
