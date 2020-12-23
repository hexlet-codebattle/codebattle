import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Table } from 'react-bootstrap';
import UserInfo from '../../containers/UserInfo';
import { actions } from '../../slices';
import { ratingSelector } from '../../slices/leaderboard';
import leaderboardTypes from '../../config/leaderboardTypes';

const TopPlayersEver = () => {
  const dispatch = useDispatch();

  const rating = useSelector(ratingSelector);

  useEffect(() => {
    (async () => {
      try {
        await dispatch(
          actions.fetchUsers({
            leaderboardType: leaderboardTypes.EVER,
          }),
        );
      } catch (e) {
        throw new Error(e.message);
      }
    })();
    /* eslint-disable-next-line */
  }, []);

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
            <span>Leaderboard</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rating
          && rating.map(item => (
            <tr key={item.name}>
              <td className="pr-0">
                <UserInfo user={item} truncate />
              </td>
              <td className="text-right pl-0">{item.rating}</td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
};

export default TopPlayersEver;
