import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Table } from 'react-bootstrap';
import classnames from 'classnames';
import UserInfo from '../../containers/UserInfo';
import { actions } from '../../slices';
import { ratingSelector, periodSelector } from '../../slices/leaderboard';
import periodTypes from '../../config/periodTypes';
import leaderboardTypes from '../../config/leaderboardTypes';

const TopPlayersPerPeriod = () => {
  const dispatch = useDispatch();

  const rating = useSelector(ratingSelector);

  const period = useSelector(periodSelector);

  const anchorMonthRef = useRef(null);

  const anchorWeekRef = useRef(null);

  const handlePeriodClick = ({ target: { textContent } }) => {
    const periodValue = textContent && textContent.trim();

    switch (periodValue) {
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
        await dispatch(
          actions.fetchUsers({
            leaderboardType: leaderboardTypes.PER_PERIOD,
            periodType: period,
          }),
        );
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
                <span className="d-flex">Leaderboard&thinsp;</span>
                <span className="small d-flex">
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
                      ref={anchorWeekRef}
                      onClick={handlePeriodClick}
                      className={classnames({
                        'text-orange': period === periodTypes.WEEKLY,
                      })}
                    >
                      {periodTypes.WEEKLY}
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
      </tbody>
    </Table>
  );
};

export default TopPlayersPerPeriod;
