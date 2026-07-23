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

const checkNeedLoading = (oldData: dayjs.ConfigType, newDate: dayjs.ConfigType) => {
  const oldBeginMonth = dayjs(oldData).startOf('month');
  const newBeginMonth = dayjs(newDate).startOf('month');

  const result = oldBeginMonth.diff(newBeginMonth, 'month');
  return result !== 0;
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

  const loadTournaments = async (_abortController?: AbortController, newDate: string = date) => {
    const beginMonth = dayjs(newDate).startOf('month').toISOString();
    const endMonth = dayjs(newDate).endOf('month').toISOString();

    const [seasonTournaments, userTournaments] = await uploadTournamentsByFilter(
      beginMonth,
      endMonth,
    );
    setTournaments({ seasonTournaments, userTournaments, loading: false });
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

  const onNavigate = (newDate: string) => {
    if (checkNeedLoading(date, newDate)) {
      const abortController = new AbortController();
      setTournaments((state) => ({ ...state, loading: true }));
      setEvents([]);
      loadTournaments(abortController, newDate).catch((e) => {
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
          onSelectEvent={setSelectedEvent}
          popup
          style={{
            minHeight: '650px',
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
      )}
    </div>
  );
}

export default TournamentSchedule;
