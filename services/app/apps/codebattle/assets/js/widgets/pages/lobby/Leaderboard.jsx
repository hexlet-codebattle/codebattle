import React, { useEffect, useMemo, useRef } from 'react';

import Table from 'react-bootstrap/Table';
import { useSelector, useDispatch } from 'react-redux';

import UserInfo from '../../components/UserInfo';
import periodTypes from '../../config/periodTypes';
import { actions } from '../../slices';
import { leaderboardSelector } from '../../slices/leaderboard';

function Leaderboard() {
  const dispatch = useDispatch();

  const { users, period } = useSelector(leaderboardSelector);

  const rating = useMemo(() => [...users].sort((a, b) => b.rating - a.rating), [users]);

  const anchorWeekRef = useRef(null);
  const anchorMonthRef = useRef(null);
  const anchorAllRef = useRef(null);

  const handlePeriodClick = e => {
    const { currentTarget: { dataset } } = e;
    const periodValue = dataset.period || periodTypes.ALL;
    e.preventDefault();

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
        throw new Error(e.message);
      }
    })();
    /* eslint-disable-next-line */
  }, [period]);

  return (
    <Table striped className="border rounded shadow-sm m-0">
      <thead>
        <tr>
          <th scope="col" className="text-uppercase p-1" colSpan="2">
            <div className="d-flex flex-column align-items-center flex-nowrap">
              <div className="d-flex align-items-center">
                <img
                  alt="rating"
                  src="/assets/images/topPlayers.svg"
                  className="m-2"
                />
                <span className="d-flex">Leaderboard</span>
              </div>
              <nav className="w-100">
                <div
                  id="nav-tab"
                  role="tablist"
                  className="nav nav-tabs border-0 d-flex flex-nowrap justify-content-around"
                >
                  <a
                    href="#!"
                    role="tab"
                    data-toggle="tab"
                    data-period={periodTypes.WEEKLY}
                    ref={anchorWeekRef}
                    className="nav-item nav-link border-0 text-center w-100 active"
                    onClick={handlePeriodClick}
                  >
                    {periodTypes.WEEKLY}
                  </a>
                  <a
                    href="#!"
                    role="tab"
                    data-toggle="tab"
                    data-period={periodTypes.MONTHLY}
                    ref={anchorMonthRef}
                    className="nav-item nav-link border-0 text-center w-100"
                    onClick={handlePeriodClick}
                  >
                    {periodTypes.MONTHLY}
                  </a>
                  <a
                    href="#!"
                    role="tab"
                    data-toggle="tab"
                    data-period={periodTypes.ALL}
                    ref={anchorAllRef}
                    className="nav-item nav-link border-0 text-center w-100"
                    onClick={handlePeriodClick}
                  >
                    {periodTypes.ALL}
                  </a>
                </div>
              </nav>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {rating && rating.length > 0 ? (
          rating
            .map(item => (
              <tr key={item.name}>
                <td className="pr-0">
                  <div className="d-flex">
                    <UserInfo user={item} truncate />
                  </div>
                </td>
                <td className="text-right pl-0">{item.rating}</td>
              </tr>
            ))
        ) : (
          <tr className="text-center">
            <td>No rating</td>
          </tr>
        )}
        <tr className="bg-light text-center">
          <td>
            <a className="btn-link text-primary" href="/users">
              Top list
            </a>
          </td>
        </tr>
      </tbody>
    </Table>
  );
}

export default Leaderboard;
