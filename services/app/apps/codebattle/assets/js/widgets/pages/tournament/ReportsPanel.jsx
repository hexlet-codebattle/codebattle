import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';

import UserInfo from '@/components/UserInfo';
import { sendNewReportState } from '@/middlewares/TournamentAdmin';
import { tournamentPlayersSelector, reportsSelector, userIsAdminSelector } from '@/selectors';

import i18next from '../../../i18n';

const customStyle = {
  control: provided => ({
    ...provided,
    height: '33px',
    minHeight: '31px',
    minWidth: '210px',
    borderRadius: '0.3rem',
    backgroundColor: 'hsl(0, 0%, 100%)',
  }),
  indicatorsContainer: provided => ({
    ...provided,
    height: '29px',
  }),
  clearIndicator: provided => ({
    ...provided,
    padding: '5px',
  }),
  dropdownIndicator: provided => ({
    ...provided,
    padding: '5px',
  }),
  input: provided => ({
    ...provided,
    height: '21px',
  }),
};

const customEventTrClassName = cn(
  'text-dark cb-custom-event-tr',
);

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0',
);

const reportStatusOptions = [
  { label: i18next.t('Pending'), value: 'pending' },
  { label: i18next.t('Processed'), value: 'processed' },
  { label: i18next.t('Confirmed'), value: 'confirmed' },
  { label: i18next.t('Denied'), value: 'denied' },
];

const getStateText = state => {
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
  const dispatch = useDispatch();
  const reports = useSelector(reportsSelector);
  const players = useSelector(tournamentPlayersSelector);
  const isAdmin = useSelector(userIsAdminSelector);

  const changeReportState = reportId => ({ value }) => {
    dispatch(sendNewReportState(reportId, value));
  };

  if (!isAdmin || reports.length === 0) {
    return <></>;
  }

  return (
    <div className="d-flex my-2">
      <table className="table table-striped cb-custom-event-table border border-secondary rounded-lg">
        <thead className="text-muted">
          <tr>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Offender')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Reporter')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('State')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Inserted At')}
            </th>
            <th className="p-1 pl-4 font-weight-light border-0">
              {i18next.t('Actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map(item => {
            const offender = players[item.offenderId];
            const reporter = players[item.reporterId];
            return (
              <React.Fragment key={`report-${item.id}`}>
                <tr className="cb-custom-event-empty-space-tr" />
                <tr className={customEventTrClassName}>
                  <td className={tableDataCellClassName}>
                    <UserInfo user={offender} banned={offender?.state === 'banned'} hideOnlineIndicator hideLink />
                  </td>
                  <td className={tableDataCellClassName}>
                    <UserInfo user={reporter} hideOnlineIndicator hideLink />
                  </td>
                  <td className={tableDataCellClassName}>
                    <Select
                      styles={customStyle}
                      value={{
                      label: getStateText(item.state),
                      value: item.state,
                    }}
                      onChange={changeReportState(item.id)}
                      options={reportStatusOptions}
                    />
                  </td>
                  <td className={tableDataCellClassName}>
                    <p>
                      {moment
                      .utc(item.insertedAt)
                      .local()
                      .format('YYYY-MM-DD HH:mm:ss')}
                    </p>
                  </td>
                  <td className={tableDataCellClassName}>
                    <a href={`/games/${item.gameId}`}>
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
