import React, { useEffect, useState, useRef } from 'react';
import { Table } from 'react-bootstrap';
import qs from 'qs';
import moment from 'moment';
import axios from 'axios';
import UserInfo from '../../containers/UserInfo';

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

  const periodRef = useRef(null);

  useEffect(() => {
    const queryParamsString = qs.stringify({
      s: 'rating+desc',
      page_size: '5',
      date_from: moment()
        .startOf(periodMapping[period])
        .utc()
        .format('YYYY-MM-DD'),
      with_bots: false,
    });

    axios.get(`/api/v1/users?${queryParamsString}`).then(res => {
      const {
        data: { users },
      } = res;
      setRating(users);
    });
  }, [period]);

  return (
    <Table striped borderless className="border border-dark m-0">
      <thead>
        <tr className="bg-gray">
          <th scope="col" className="text-uppercase p-1" colSpan="2">
            <img
              alt="rating"
              src="/assets/images/topPlayers.svg"
              className="m-2"
            />
            Leaderboard
            {' '}
            <u>
              <a
                href="#!"
                ref={periodRef}
                onClick={e => {
                  e.preventDefault();

                  const {
                    target: { textContent: periodValue },
                  } = e;

                  switch (periodValue.trim()) {
                    case periodType.MONTHLY:
                      setPeriod(periodType.WEEKLY);
                      break;

                    case periodType.WEEKLY:
                      setPeriod(periodType.MONTHLY);
                      break;

                    default:
                      throw new Error(`Unknown period: ${periodValue.trim()}`);
                  }
                }}
              >
                {period}
              </a>
            </u>
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
