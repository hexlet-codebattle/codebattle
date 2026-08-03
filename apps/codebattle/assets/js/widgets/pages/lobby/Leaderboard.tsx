import React, { useEffect, useMemo } from 'react';

import Table from 'react-bootstrap/Table';
import { useSelector, useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import { type UserNameUser } from '../../components/UserName';
import UserInfo from '../../components/UserInfo';
import periodTypes from '../../config/periodTypes';
import { actions, type AppDispatch } from '../../slices';
import { leaderboardSelector } from '../../slices/leaderboard';

interface LeaderboardUser extends UserNameUser {
  rating?: number;
}

function Leaderboard() {
  const dispatch = useDispatch<AppDispatch>();

  const { users, period } = useSelector(leaderboardSelector);

  const rating = useMemo(
    () => [...(users as LeaderboardUser[])].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [users],
  );

  const handlePeriodClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const {
      currentTarget: { dataset },
    } = e;
    const periodValue = dataset.period || periodTypes.ALL;
    switch (periodValue) {
      case periodTypes.ALL:
        dispatch(actions.changePeriod(periodTypes.ALL));
        break;
      case periodTypes.MONTHLY:
        dispatch(actions.changePeriod(periodTypes.MONTHLY));
        break;

      case periodTypes.WEEKLY:
        dispatch(actions.changePeriod(periodTypes.WEEKLY));
        break;

      default:
        throw new Error(`Unknown period: ${periodValue}`);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await dispatch(actions.fetchUsers({ periodType: period }));
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
      }
    })();
    /* eslint-disable-next-line */
  }, [period]);

  return (
    <Table striped className="cb-bg-panel cb-border-color rounded shadow-sm m-0">
      <thead>
        <tr aria-label={i18n.t('Leaderboard header')}>
          <th
            scope="col"
            aria-label={i18n.t('Leaderboard')}
            className="text-uppercase py-1 px-0 text-white cb-border-color"
            colSpan={2}
          >
            <div className="d-flex flex-column align-items-center flex-nowrap">
              <div className="d-flex align-items-center">
                <img alt={i18n.t('Rating')} src="/assets/images/topPlayers.svg" className="m-2" />
                <span className="d-flex">{i18n.t('Leaderboard')}</span>
              </div>
              <nav className="w-100">
                <div
                  id="nav-tab"
                  role="tablist"
                  className="nav nav-tabs border-0 d-flex flex-nowrap justify-content-around"
                >
                  <button
                    type="button"
                    role="tab"
                    data-toggle="tab"
                    data-period={periodTypes.WEEKLY}
                    className="nav-item cb-nav-item nav-link border-0 text-center w-100 active"
                    onClick={handlePeriodClick}
                  >
                    {i18n.t(periodTypes.WEEKLY)}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    data-toggle="tab"
                    data-period={periodTypes.MONTHLY}
                    className="nav-item cb-nav-item nav-link border-0 text-center w-100"
                    onClick={handlePeriodClick}
                  >
                    {i18n.t(periodTypes.MONTHLY)}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    data-toggle="tab"
                    data-period={periodTypes.ALL}
                    className="nav-item cb-nav-item nav-link border-0 text-center w-100"
                    onClick={handlePeriodClick}
                  >
                    {i18n.t(periodTypes.ALL)}
                  </button>
                </div>
              </nav>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {rating && rating.length > 0 ? (
          rating.map((item) => (
            <tr key={item.name} className="cb-border-color">
              <td className="cb-border-color pr-0">
                <div className="d-flex">
                  <UserInfo user={item} truncate />
                </div>
              </td>
              <td className="border-bottom cb-border-color text-right pl-0">{item.rating}</td>
            </tr>
          ))
        ) : (
          <tr className="text-center cb-border-color">
            <td className="cb-border-color">{i18n.t('No rating')}</td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}

export default Leaderboard;
