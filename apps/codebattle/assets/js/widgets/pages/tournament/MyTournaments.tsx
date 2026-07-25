import React, { useCallback, useEffect, useRef, useState } from 'react';

import { camelizeKeys } from 'humps';
import i18next from 'i18next';
import unionBy from 'lodash/unionBy';

import Loading from '../../components/Loading';

import { formatStartsAt } from './dateTime';

interface CreatedTournament {
  id: number;
  name?: string;
  type?: string;
  level?: string;
  state?: string;
  startsAt?: string;
}

interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}

type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface MyTournamentsProps {
  isActive?: boolean;
  userTimezone?: string;
}

function MyTournaments({ isActive = false, userTimezone = 'UTC' }: MyTournamentsProps) {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [tournaments, setTournaments] = useState<CreatedTournament[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    pageNumber: 1,
    pageSize: 20,
    totalEntries: 0,
    totalPages: 1,
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);
  const pageInfoRef = useRef(pageInfo);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    pageInfoRef.current = pageInfo;
  }, [pageInfo]);

  const fetchPage = useCallback(async (page: number, append = false) => {
    if (statusRef.current === 'loading') {
      return;
    }

    if (append && page > pageInfoRef.current.totalPages) {
      return;
    }

    setStatus('loading');

    try {
      const query = new URLSearchParams({
        page: String(page),
        page_size: String(pageInfoRef.current.pageSize),
      }).toString();
      const response = await fetch(`/api/v1/tournaments/created?${query}`);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = camelizeKeys(await response.json());

      setPageInfo(payload.pageInfo || pageInfoRef.current);
      setTournaments((prev) => {
        const incoming = payload.tournaments || [];
        return append ? unionBy(prev, incoming, 'id') : incoming;
      });
      setStatus('loaded');
    } catch (_error) {
      setStatus('error');
    }
  }, []);

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
    if (status === 'loading' || status === 'idle') {
      return <Loading />;
    }

    if (status === 'error') {
      return (
        <div className="py-5 text-center text-muted">{i18next.t('Failed to load tournaments')}</div>
      );
    }

    return (
      <div className="py-5 text-center text-muted">
        {i18next.t("You haven't created any tournaments yet")}
      </div>
    );
  }

  return (
    <div className="h-100 d-flex flex-column">
      <div ref={tableRef} className="table-responsive mvh-100 cb-overflow-y-scroll">
        <table className="table table-striped mb-0">
          <thead className="cb-text sticky-top">
            <tr>
              <th className="p-3 border-0">{i18next.t('Name')}</th>
              <th className="p-3 border-0">{i18next.t('Type')}</th>
              <th className="p-3 border-0">{i18next.t('Level')}</th>
              <th className="p-3 border-0">{i18next.t('State')}</th>
              <th className="p-3 border-0">{i18next.t('Starts at')}</th>
              <th className="p-3 border-0">{i18next.t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="cb-text">
            {tournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle cb-border-color">{tournament.name}</td>
                <td className="p-3 align-middle text-break cb-border-color">{tournament.type}</td>
                <td
                  className="p-3 align-middle cb-border-color"
                  aria-label={`Level: ${tournament.level}`}
                >
                  <div className="bg-gray p-1 d-inline-block cb-rounded">
                    <img
                      alt={tournament.level}
                      src={`/assets/images/levels/${tournament.level}.svg`}
                    />
                  </div>
                </td>
                <td className="p-3 align-middle text-break cb-border-color">{tournament.state}</td>
                <td className="p-3 align-middle text-break text-nowrap cb-border-color">
                  {formatStartsAt(tournament.startsAt, userTimezone)}
                </td>
                <td className="p-3 align-middle text-nowrap cb-border-color">
                  <a
                    href={`/tournaments/${tournament.id}`}
                    className="btn btn-sm btn-success cb-btn-success cb-rounded me-2"
                  >
                    {i18next.t('Show')}
                  </a>
                  <a
                    href={`/tournaments/${tournament.id}/edit`}
                    className="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                  >
                    {i18next.t('Edit')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-auto border-top cb-border-color py-2 px-3 font-weight-bold text-muted rounded-bottom">
        {i18next.t('Total tournaments: %{count}', { count: pageInfo.totalEntries })}
      </div>
    </div>
  );
}

export default MyTournaments;
