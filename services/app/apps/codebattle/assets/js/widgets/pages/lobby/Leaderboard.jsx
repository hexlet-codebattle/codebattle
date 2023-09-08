import React, { useEffect, useRef } from 'react';

import classnames from 'classnames';
import Table from 'react-bootstrap/Table';
import { useSelector, useDispatch } from 'react-redux';

import UserInfo from '../../components/UserInfo';
import periodTypes from '../../config/periodTypes';
import { actions } from '../../slices';
import { leaderboardSelector } from '../../slices/leaderboard';

function Leaderboard() {
  const dispatch = useDispatch();

  const { period, users: rating } = useSelector(leaderboardSelector);

  const anchorWeekRef = useRef(null);
  const anchorMonthRef = useRef(null);
  const anchorAllRef = useRef(null);

  const handlePeriodClick = (e) => {
    const {
      target: { textContent },
    } = e;
    const periodValue = textContent && textContent.trim();
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
    <Table borderless striped className="border border-dark m-0">
      <thead>
        <tr className="bg-gray">
          <th className="text-uppercase p-1" colSpan="2" scope="col">
            <div className="d-flex align-items-center flex-nowrap">
              <img alt="rating" className="m-2" src="/assets/images/topPlayers.svg" />
              <p className="d-inline-flex align-items-baseline flex-nowrap m-0 p-0">
                <span className="d-flex">Leaderboard</span>
                <span className="ml-2 small d-flex">
                  <u>
                    <a
                      ref={anchorWeekRef}
                      href="#!"
                      className={classnames({
                        'text-orange': period === periodTypes.WEEKLY,
                      })}
                      onClick={handlePeriodClick}
                    >
                      {periodTypes.WEEKLY}
                    </a>
                  </u>
                  /
                  <u>
                    <a
                      ref={anchorMonthRef}
                      href="#!"
                      className={classnames({
                        'text-orange': period === periodTypes.MONTHLY,
                      })}
                      onClick={handlePeriodClick}
                    >
                      {periodTypes.MONTHLY}
                    </a>
                  </u>
                  /
                  <u>
                    <a
                      ref={anchorAllRef}
                      href="#!"
                      className={classnames({
                        'text-orange': period === periodTypes.ALL,
                      })}
                      onClick={handlePeriodClick}
                    >
                      {periodTypes.ALL}
                    </a>
                  </u>
                </span>
              </p>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {rating &&
          rating.map((item) => (
            <tr key={item.name}>
              <td className="pr-0">
                <div className="d-flex">
                  <UserInfo truncate user={item} />
                </div>
              </td>
              <td className="text-right pl-0">{item.rating}</td>
            </tr>
          ))}
        <tr>
          <td className="pr-0">
            <div className="mt-2">
              <u>
                <a href="/users">TOP list</a>
              </u>
            </div>
          </td>
          <td className="text-right pl-0" />
        </tr>
      </tbody>
    </Table>
  );
}

export default Leaderboard;
