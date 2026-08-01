import React from 'react';

import { getGradeLabel } from '@/config/grades';

import i18n from '../../../i18n';
import dayjs from '../../../i18n/dayjs';
import { localizeTournamentName } from '../../utils/localizeTournamentName';

interface HistoryWinner {
  id?: number | string;
  name?: string;
  avatarUrl?: string;
}

export interface HistoryTournament {
  id: number | string;
  name: string;
  grade?: string;
  type?: string;
  state?: string;
  startsAt?: string;
  lastRoundEndedAt?: string;
  playersCount?: number;
  winner?: HistoryWinner | null;
}

interface TournamentHistoryListProps {
  tournaments: HistoryTournament[];
  loading: boolean;
}

const formatDuration = (t: HistoryTournament): string | null => {
  if (!t.startsAt || !t.lastRoundEndedAt) {
    return null;
  }

  const minutes = dayjs(t.lastRoundEndedAt).diff(dayjs(t.startsAt), 'minute');

  if (minutes <= 0) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
};

function TournamentHistoryList({ tournaments, loading }: TournamentHistoryListProps) {
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5 cb-text">
        <div className="spinner-border" role="status" aria-hidden="true" />
        <span className="ml-3">{i18n.t('Loading...')}</span>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5 cb-text">
        {i18n.t('No finished tournaments yet')}
      </div>
    );
  }

  return (
    <div className="cb-schedule-list d-flex flex-column">
      <div className="cb-schedule-list-head d-none d-md-flex align-items-center px-3 py-2">
        <span className="cb-schedule-col-grade">{i18n.t('Tournament')}</span>
        <span className="cb-schedule-col-date">{i18n.t('Date')}</span>
        <span className="cb-schedule-col-duration">{i18n.t('Duration')}</span>
        <span className="cb-schedule-col-players">{i18n.t('Players')}</span>
        <span className="cb-schedule-col-winner">{i18n.t('Winner')}</span>
        <span className="cb-schedule-col-action" />
      </div>
      {tournaments.map((t) => {
        const duration = formatDuration(t);

        return (
          <a
            key={t.id}
            href={`/tournaments/${t.id}`}
            className="cb-schedule-list-row d-flex flex-column flex-md-row align-items-md-center px-3 py-3"
            style={{ '--cb-row-grade': `var(--cb-grade-${t.grade})` } as React.CSSProperties}
          >
            <span className="cb-schedule-col-grade d-flex align-items-center">
              <span
                className="cb-schedule-grade-dot mr-2"
                style={{ backgroundColor: `var(--cb-grade-${t.grade})` }}
              />
              <span className="d-flex flex-column">
                <span className="cb-schedule-row-name">
                  {localizeTournamentName(t.name, t.grade)}
                </span>
                <small className="cb-schedule-row-grade-label">
                  {t.grade ? i18n.t(getGradeLabel(t.grade)) : null}
                </small>
              </span>
            </span>
            <span className="cb-schedule-col-date">
              {t.startsAt ? dayjs(t.startsAt).format('MMM D, YYYY') : '—'}
            </span>
            <span className="cb-schedule-col-duration">{duration || '—'}</span>
            <span className="cb-schedule-col-players">
              <i className="fa fa-users mr-1" aria-hidden="true" />
              {t.playersCount ?? 0}
            </span>
            <span className="cb-schedule-col-winner d-flex align-items-center">
              {t.winner ? (
                <>
                  {t.winner.avatarUrl && (
                    <img
                      src={t.winner.avatarUrl}
                      alt={t.winner.name}
                      className="cb-schedule-winner-avatar mr-2"
                    />
                  )}
                  <span className="text-truncate">{t.winner.name}</span>
                </>
              ) : (
                '—'
              )}
            </span>
            <span className="cb-schedule-col-action">
              <span className="btn btn-sm cb-btn-secondary cb-rounded">{i18n.t('Open')}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

export default TournamentHistoryList;
