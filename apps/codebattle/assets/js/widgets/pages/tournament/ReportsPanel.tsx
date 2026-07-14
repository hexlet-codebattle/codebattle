import React, { memo, useMemo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';

import { customStyle } from '@/components/LanguagePickerView';
import UserInfo from '@/components/UserInfo';
import { sendNewReportState } from '@/middlewares/TournamentAdmin';
import {
  tournamentPlayersSelector,
  reportsSelector,
  currentUserIsAdminSelector,
} from '@/selectors';

import { type AppDispatch } from '@/slices';
import { type Player } from '@/slices/initial';

import i18next from '../../../i18n';

const customEventTrClassName = cn('cb-custom-event-tr align-items-center');

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 ml-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

interface ReportStateOption {
  label: string;
  value: string;
}

const reportStatusOptions: ReportStateOption[] = [
  { label: i18next.t('Pending'), value: 'pending' },
  { label: i18next.t('Processed'), value: 'processed' },
  { label: i18next.t('Confirmed'), value: 'confirmed' },
  { label: i18next.t('Denied'), value: 'denied' },
];

interface Report {
  id: number;
  offenderId: number;
  reporterId: number;
  gameId: number;
  state: string;
  insertedAt: string;
  [key: string]: unknown;
}

const getStateText = (state: string) => {
  switch (state) {
    case 'pending':
      return i18next.t('Pending');
    case 'processed':
      return i18next.t('Processed');
    case 'confirmed':
      return i18next.t('Confirmed');
    case 'denied':
      return i18next.t('Denied');
    default:
      return i18next.t('Select');
  }
};

function ReportsPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const reports = useSelector(reportsSelector) as Report[];
  const players = useSelector(tournamentPlayersSelector) as Record<number, Player>;
  const isAdmin = useSelector(currentUserIsAdminSelector);

  const sortedReports = useMemo(() => {
    const activeCountByOffender = reports.reduce<Record<number, number>>((acc, item) => {
      if (item.state !== 'denied') {
        acc[item.offenderId] = (acc[item.offenderId] || 0) + 1;
      }
      return acc;
    }, {});

    return [...reports].sort((a, b) => {
      const aDenied = a.state === 'denied' ? 1 : 0;
      const bDenied = b.state === 'denied' ? 1 : 0;
      if (aDenied !== bDenied) return aDenied - bDenied;

      const aCount = activeCountByOffender[a.offenderId] || 0;
      const bCount = activeCountByOffender[b.offenderId] || 0;
      if (aCount !== bCount) return bCount - aCount;

      if (a.offenderId !== b.offenderId) {
        return a.offenderId < b.offenderId ? -1 : 1;
      }

      return new Date(b.insertedAt).getTime() - new Date(a.insertedAt).getTime();
    });
  }, [reports]);

  const changeReportState = (reportId: number) => (option: ReportStateOption | null) => {
    if (option) {
      dispatch(sendNewReportState(reportId, option.value));
    }
  };

  if (!isAdmin || reports.length === 0) {
    return <></>;
  }

  return (
    <div className="d-flex my-2">
      <table className="table table-striped cb-custom-event-table border cb-border-color border-secondary cb-rounded">
        <thead className="cb-text">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Offender')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Reporter')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('State')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Inserted At')}</th>
            <th className="p-1 pl-4 font-weight-light border-0">{i18next.t('Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedReports.map((item) => {
            const offender = players[item.offenderId];
            const reporter = players[item.reporterId];
            return (
              <React.Fragment key={`report-${item.id}`}>
                <tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                <tr className={customEventTrClassName}>
                  <td className={tableDataCellClassName}>
                    <UserInfo
                      user={offender}
                      banned={offender?.state === 'banned'}
                      hideOnlineIndicator
                      hideLink
                    />
                  </td>
                  <td className={tableDataCellClassName}>
                    <UserInfo user={reporter} hideOnlineIndicator hideLink />
                  </td>
                  <td className={tableDataCellClassName}>
                    <Select<ReportStateOption>
                      styles={
                        customStyle as unknown as React.ComponentProps<
                          typeof Select<ReportStateOption>
                        >['styles']
                      }
                      value={{
                        label: getStateText(item.state),
                        value: item.state,
                      }}
                      onChange={changeReportState(item.id)}
                      options={reportStatusOptions}
                    />
                  </td>
                  <td className={tableDataCellClassName}>
                    <span className="text-white">
                      {dayjs(item.insertedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </span>
                  </td>
                  <td className={tableDataCellClassName}>
                    <a href={`/games/${item.gameId}?realtime=true`}>
                      <FontAwesomeIcon icon="link" />
                    </a>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default memo(ReportsPanel);
