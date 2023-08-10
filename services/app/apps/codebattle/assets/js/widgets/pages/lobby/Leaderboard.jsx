import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Table } from 'react-bootstrap';
import classnames from 'classnames';
import UserInfo from '../../components/UserInfo';
import { actions } from '../../slices';
import { leaderboardSelector } from '../../slices/leaderboard';
import periodTypes from '../../config/periodTypes';

function Leaderboard() {
  const dispatch = useDispatch();

  const { users: rating, period } = useSelector(leaderboardSelector);

  const anchorWeekRef = useRef(null);
  const anchorMonthRef = useRef(null);
  const anchorAllRef = useRef(null);

  const handlePeriodClick = e => {
    const { target: { textContent } } = e;
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
    <Table striped borderless className="border border-dark m-0">
      <thead>
        <tr className="bg-gray">
          <th scope="col" className="text-uppercase p-1" colSpan="2">
            <div className="d-flex align-items-center flex-nowrap">
              <img
                alt="rating"
                src="/assets/images/topPlayers.svg"
                className="m-2"
              />
              <p className="d-inline-flex align-items-baseline flex-nowrap m-0 p-0">
                <span className="d-flex">Leaderboard</span>
                <span className="ml-2 small d-flex">
                  <u>
                    <a
                      href="#!"
                      ref={anchorWeekRef}
                      onClick={handlePeriodClick}
                      className={classnames({
                        'text-orange': period === periodTypes.WEEKLY,
                      })}
                    >
                      {periodTypes.WEEKLY}
                    </a>
                  </u>
                  /
                  <u>
                    <a
                      href="#!"
                      ref={anchorMonthRef}
                      onClick={handlePeriodClick}
                      className={classnames({
                        'text-orange': period === periodTypes.MONTHLY,
                      })}
                    >
                      {periodTypes.MONTHLY}
                    </a>
                  </u>
                  /
                  <u>
                    <a
                      href="#!"
                      ref={anchorAllRef}
                      onClick={handlePeriodClick}
                      className={classnames({
                        'text-orange': period === periodTypes.ALL,
                      })}
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
        {rating
          && rating.map(item => (
            <tr key={item.name}>
              <td className="pr-0">
                <div className="d-flex">
                  <UserInfo user={item} truncate />
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
