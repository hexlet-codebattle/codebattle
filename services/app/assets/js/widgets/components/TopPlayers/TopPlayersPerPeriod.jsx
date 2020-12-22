import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Table } from 'react-bootstrap';
import moment from 'moment';
import classnames from 'classnames';
import UserInfo from '../../containers/UserInfo';
import { actions } from '../../slices';

const periodType = {
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
};

const periodMapping = {
  [periodType.MONTHLY]: 'month',
  [periodType.WEEKLY]: 'week',
};

const TopPlayersPerPeriod = () => {
  const [rating, setRating] = useState(null);

  const [period, setPeriod] = useState(periodType.MONTHLY);

  const anchorMonthRef = useRef(null);

  const anchorWeekRef = useRef(null);

  const dispatch = useDispatch();

  const handlePeriodClick = ({ target: { textContent } }) => {
    const periodValue = textContent && textContent.trim();

    switch (periodValue) {
      case periodType.MONTHLY:
        setPeriod(periodType.MONTHLY);
        break;

      case periodType.WEEKLY:
        setPeriod(periodType.WEEKLY);
        break;

      default:
        throw new Error(`Unknown period: ${periodValue}`);
    }
  };

  const handlePeriodMouseEnter = element => {
    if (!element.classList.contains('text-orange')) {
      element.classList.add('text-orange');
    }
  };

  const handlePeriodMouseLeave = element => {
    if (element.textContent !== period) {
      element.classList.remove('text-orange');
      element.classList.add('text-black');
    }
  };

  useEffect(() => {
    const params = {
      s: 'rating+desc',
      page_size: '5',
      date_from: moment()
        .startOf(periodMapping[period])
        .utc()
        .format('YYYY-MM-DD'),
      with_bots: false,
    };

    (async () => {
      try {
        const response = await dispatch(
          actions.fetchUsers({ type: 'perPeriod', params }),
        );

        setRating(response.payload.users);
      } catch (e) {
        throw new Error(e.message);
      }
    })();
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
                      onMouseEnter={() => handlePeriodMouseEnter(anchorMonthRef.current)}
                      onMouseLeave={() => handlePeriodMouseLeave(anchorMonthRef.current)}
                      className={classnames({
                        'text-orange': period === periodType.MONTHLY,
                        'text-black': period !== periodType.MONTHLY,
                      })}
                    >
                      {periodType.MONTHLY}
                    </a>
                  </u>
                  /
                  <u>
                    <a
                      href="#!"
                      ref={anchorWeekRef}
                      onClick={handlePeriodClick}
                      onMouseEnter={() => handlePeriodMouseEnter(anchorWeekRef.current)}
                      onMouseLeave={() => handlePeriodMouseLeave(anchorWeekRef.current)}
                      className={classnames({
                        'text-orange': period === periodType.WEEKLY,
                        'text-black': period !== periodType.WEEKLY,
                      })}
                    >
                      {periodType.WEEKLY}
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
