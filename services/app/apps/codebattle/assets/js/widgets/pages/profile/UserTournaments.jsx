import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import axios from 'axios';
import { camelizeKeys } from 'humps';
import unionBy from 'lodash/unionBy';
import moment from 'moment';

import Loading from '../../components/Loading';

const gradeColors = {
  grand_slam: '#e0bf7a',
  masters: '#c2c9d6',
  elite: '#c48a57',
  pro: '#a4aab3',
  challenger: '#8a919c',
  rookie: '#6f7782',
  open: '#8a919c',
};

const formatGrade = (grade) => grade.replaceAll('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

const formatTime = (seconds) => {
  const total = Number(seconds || 0);

  if (total < 3600) {
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  const hh = String(Math.floor(total / 3600)).padStart(2, '0');
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const navigateToTournament = (tournamentId) => {
  window.location.assign(`/tournaments/${tournamentId}`);
};

function UserTournaments({ isActive = false }) {
  const [status, setStatus] = useState('idle');
  const [tournaments, setTournaments] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    pageNumber: 1,
    pageSize: 20,
    totalEntries: 0,
    totalPages: 1,
  });

  const tableRef = useRef(null);
  const statusRef = useRef(status);
  const pageInfoRef = useRef(pageInfo);
  const userId = useMemo(() => window.location.pathname.split('/').pop(), []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    pageInfoRef.current = pageInfo;
  }, [pageInfo]);

  const fetchPage = useCallback(async (page, append = false) => {
    if (statusRef.current === 'loading') {
      return;
    }

    if (append && page > pageInfoRef.current.totalPages) {
      return;
    }

    setStatus('loading');

    try {
      const nextPageSize = pageInfoRef.current.pageSize;
      const response = await axios.get(`/api/v1/user/${userId}/tournaments`, {
        params: {
          page,
          page_size: nextPageSize,
        },
      });
      const payload = camelizeKeys(response.data);

      setPageInfo(payload.pageInfo || pageInfoRef.current);
      setTournaments((prev) => {
        const incoming = payload.tournaments || [];
        return append ? unionBy(prev, incoming, 'tournamentId') : incoming;
      });
      setStatus('loaded');
    } catch (_error) {
      setStatus('error');
    }
  }, [userId]);

  useEffect(() => {
    if (!isActive || tournaments.length > 0 || status !== 'idle') {
      return;
    }

    fetchPage(1, false);
  }, [fetchPage, isActive, status, tournaments.length]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const observableTable = tableRef.current;

    if (!observableTable) {
      return undefined;
    }

    const onTableScroll = () => {
      if (statusRef.current === 'loading') {
        return;
      }

      const maxScroll = observableTable.scrollHeight - observableTable.clientHeight;

      if (maxScroll <= 0) {
        return;
      }

      const delta = maxScroll - observableTable.scrollTop;
      const currentPageInfo = pageInfoRef.current;

      if (delta < 500 && currentPageInfo.pageNumber < currentPageInfo.totalPages) {
        fetchPage(currentPageInfo.pageNumber + 1, true);
      }
    };

    observableTable.addEventListener('scroll', onTableScroll);

    return () => {
      observableTable.removeEventListener('scroll', onTableScroll);
    };
  }, [fetchPage, isActive]);

  if (tournaments.length === 0) {
    if (status === 'loading') {
      return <Loading />;
    }

    if (status === 'error') {
      return <div className="py-5 text-center text-muted">Failed to load tournaments</div>;
    }

    return <div className="py-5 text-center text-muted">No tournaments played yet</div>;
  }

  return (
    <div className="h-100 d-flex flex-column">
      <div ref={tableRef} className="table-responsive cb-overflow-y-scroll">
        <table className="table table-striped mb-0">
          <thead className="cb-text sticky-top">
            <tr>
              <th className="p-3 border-0">Grade</th>
              <th className="p-3 border-0">Place</th>
              <th className="p-3 border-0">Points</th>
              <th className="p-3 border-0">Score</th>
              <th className="p-3 border-0">Games</th>
              <th className="p-3 border-0">Wins</th>
              <th className="p-3 border-0">Time</th>
              <th className="p-3 border-0">Lang</th>
              <th className="p-3 border-0">Date</th>
            </tr>
          </thead>
          <tbody className="cb-text">
            {tournaments.map((item) => (
              <tr
                key={item.tournamentId}
                role="link"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => navigateToTournament(item.tournamentId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateToTournament(item.tournamentId);
                  }
                }}
              >
                <td className="p-3 align-middle text-nowrap cb-border-color">
                  <span
                    className="px-2 py-1 cb-rounded"
                    style={{
                      backgroundColor: gradeColors[item.tournamentGrade] || '#8a919c',
                      color: '#1f2530',
                      fontWeight: 700,
                    }}
                  >
                    {formatGrade(item.tournamentGrade || 'open')}
                  </span>
                </td>
                <td className="p-3 align-middle text-nowrap cb-border-color">{`#${item.place}`}</td>
                <td className="p-3 align-middle text-nowrap cb-border-color">{item.points}</td>
                <td className="p-3 align-middle text-nowrap cb-border-color">{item.score}</td>
                <td className="p-3 align-middle text-nowrap cb-border-color">{item.gamesCount}</td>
                <td className="p-3 align-middle text-nowrap cb-border-color">{item.winsCount}</td>
                <td className="p-3 align-middle text-nowrap cb-border-color">{formatTime(item.totalTime)}</td>
                <td className="p-3 align-middle text-nowrap cb-border-color">{item.userLang || '-'}</td>
                <td className="p-3 align-middle text-nowrap cb-border-color">
                  {moment.utc(item.tournamentStartedAt).local().format('MM.DD HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-auto border-top cb-border-color py-2 px-3 font-weight-bold text-muted rounded-bottom">
        {`Total tournaments: ${pageInfo.totalEntries}`}
      </div>
    </div>
  );
}

export default UserTournaments;
