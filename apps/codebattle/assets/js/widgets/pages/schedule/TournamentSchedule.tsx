import React, { useCallback, useEffect, useState } from 'react';

import NiceModal from '@ebay/nice-modal-react';
import cn from 'classnames';
import uniqBy from 'lodash/uniqBy';
import { Calendar as BigCalendar, dayjsLocalizer } from 'react-big-calendar';
import { useSelector } from 'react-redux';

import { grades } from '@/config/grades';
import ModalCodes from '@/config/modalCodes';
import { uploadFinishedTournaments, uploadTournamentsByFilter } from '@/middlewares/Tournament';
import { currentUserIsAdminSelector } from '@/selectors';
import useTournamentScheduleModals from '@/utils/useTournamentScheduleModals';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';

import ScheduleLegend, { states, type ScheduleContext } from './ScheduleLegend';
import TournamentHistoryList, { type HistoryTournament } from './TournamentHistoryList';

const views = {
  month: 'month',
  week: 'week',
  day: 'day',
  agenda: 'agenda',
} as const;

type ScheduleView = (typeof views)[keyof typeof views];

interface Tournament {
  id: number | string;
  name: string;
  grade?: string;
  state?: string;
  startsAt: string;
  creatorId?: number | string;
  finished?: boolean;
  lastRoundEndedAt?: string;
  [key: string]: unknown;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resourse: Tournament;
}

interface TournamentsState {
  seasonTournaments: Tournament[];
  userTournaments: Tournament[];
  loading: boolean;
}

const haveSeasonGrade = (t: Tournament) => t.grade !== grades.open;
const notCancelled = (t: Tournament) => t.state !== 'canceled';
const getEndOffsetParams = (t: Tournament): [number, dayjs.ManipulateType] => {
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

const getEventFromTournamentData = (t: Tournament): CalendarEvent => ({
  title: t.name,
  start: dayjs(t.startsAt).toDate(),
  end: dayjs(t.startsAt)
    .add(...getEndOffsetParams(t))
    .toDate(),
  resourse: {
    ...t,
  },
});

const stateList: ScheduleContext[] = Object.values(states);

const getStateFromHash = (): ScheduleContext => {
  const { hash } = window.location;

  if (stateList.includes(hash as ScheduleContext)) {
    return hash as ScheduleContext;
  }

  return states.contest;
};

// const eventPropGetter = (event, _start, _end, _isSelected) => ({
const eventPropGetter = (event: CalendarEvent) => ({
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

// react-big-calendar's onRangeChange reports the visible range either as an
// array of dates (day/week views) or as a { start, end } object (month/agenda).
const getRangeBounds = (range: Date[] | { start: Date; end: Date }) => {
  if (Array.isArray(range)) {
    return { start: range[0], end: range[range.length - 1] };
  }

  return { start: range.start, end: range.end };
};

function TournamentSchedule() {
  const [event, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [context, setContext] = useState<ScheduleContext>(getStateFromHash);
  const [tournaments, setTournaments] = useState<TournamentsState>({
    seasonTournaments: [],
    userTournaments: [],
    loading: true,
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [history, setHistory] = useState<{ tournaments: HistoryTournament[]; loading: boolean }>({
    tournaments: [],
    loading: false,
  });
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [date, setDate] = useState<string>(dayjs().format());
  const [view, setView] = useState<ScheduleView>(views.month);
  const isAdmin = useSelector(currentUserIsAdminSelector);

  useTournamentScheduleModals();

  const codebattleLocalizer = dayjsLocalizer(dayjs);

  const loadTournaments = async (beginDate: string, endDate: string) => {
    const [seasonTournaments, userTournaments] = await uploadTournamentsByFilter(
      beginDate,
      endDate,
    );
    setTournaments({ seasonTournaments, userTournaments, loading: false });
  };

  const loadTournamentsForRange = (range: Date[] | { start: Date; end: Date }) => {
    const { start, end } = getRangeBounds(range);
    const beginDate = dayjs(start).startOf('day').toISOString();
    const endDate = dayjs(end).endOf('day').toISOString();

    setTournaments((state) => ({ ...state, loading: true }));
    setEvents([]);
    loadTournaments(beginDate, endDate).catch((e) => {
      console.error(e);
      setTournaments((state) => ({ ...state, loading: false }));
    });
  };

  const onView = useCallback(
    (v: ScheduleView) => {
      setView(v);
    },
    [setView],
  );

  const onChangeContext: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();

    try {
      if (
        e.currentTarget.dataset.context &&
        stateList.includes(e.currentTarget.dataset.context as ScheduleContext)
      ) {
        const { context: newContext } = e.currentTarget.dataset;
        window.location.hash = newContext;
        setContext(newContext as ScheduleContext);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Keep the controlled `date` in sync; the actual data fetch is driven by
  // onRangeChange so the loaded interval always matches what the calendar shows.
  const onNavigate = (newDate: string) => {
    setDate(newDate);
  };

  const onRangeChange = useCallback((range: Date[] | { start: Date; end: Date }) => {
    loadTournamentsForRange(range);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  useEffect(() => {
    const beginDate = dayjs(date).startOf('month').toISOString();
    const endDate = dayjs(date).endOf('month').toISOString();
    loadTournaments(beginDate, endDate).catch((e) => console.error(e));
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
      const newEvents = uniqBy(
        [...tournaments.seasonTournaments, ...tournaments.userTournaments.filter(haveSeasonGrade)],
        'id',
      )
        .filter(notCancelled)
        .map(getEventFromTournamentData);

      setEvents(newEvents);
    } else if (context === states.my) {
      const newEvents = tournaments.userTournaments
        .filter(notCancelled)
        .map(getEventFromTournamentData);

      setEvents(newEvents);
    } else if (context === states.all) {
      const newEvents = uniqBy(
        [...tournaments.seasonTournaments, ...tournaments.userTournaments],
        'id',
      )
        .filter(notCancelled)
        .map(getEventFromTournamentData);

      setEvents(newEvents);
    }
  }, [context, tournaments, isAdmin]);

  useEffect(() => {
    if (context !== states.list || historyLoaded) {
      return;
    }

    setHistory((state) => ({ ...state, loading: true }));
    setHistoryLoaded(true);

    uploadFinishedTournaments()
      .then((tournamentsList: HistoryTournament[]) => {
        setHistory({ tournaments: tournamentsList, loading: false });
      })
      .catch((e) => {
        console.error(e);
        setHistory({ tournaments: [], loading: false });
        setHistoryLoaded(false);
      });
  }, [context, historyLoaded]);

  useEffect(() => {
    if (event) {
      NiceModal.show(ModalCodes.calendarEventModal, {
        event,
        events,
        clearEvent: setSelectedEvent,
      });
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
      {context === states.list ? (
        <TournamentHistoryList tournaments={history.tournaments} loading={history.loading} />
      ) : (
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
          onRangeChange={onRangeChange}
          onSelectEvent={setSelectedEvent}
          popup
          style={{
            minHeight: '650px',
            height: '100%',
          }}
          views={[views.month, views.day, views.agenda]}
          eventPropGetter={eventPropGetter}
          className="cb-rbc-calendar"
          messages={{
            today: i18n.t('Today'),
            previous: i18n.t('Back'),
            next: i18n.t('Next'),
            month: i18n.t('Month'),
            week: i18n.t('Week'),
            day: i18n.t('Day'),
            agenda: i18n.t('Agenda'),
            date: i18n.t('Date'),
            time: i18n.t('Time'),
            event: i18n.t('Event'),
            noEventsInRange: i18n.t('There are no tournaments in this range.'),
            showMore: (total: number) => i18n.t('+%{count} more', { count: total }),
          }}
          formats={{
            monthHeaderFormat: 'MMMM YYYY',
            dayHeaderFormat: 'dddd MMMM DD',
          }}
        />
      )}
    </div>
  );
}

export default TournamentSchedule;
