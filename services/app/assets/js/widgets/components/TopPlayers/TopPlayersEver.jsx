import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Table } from 'react-bootstrap';
import UserInfo from '../../containers/UserInfo';
import { actions } from '../../slices';

const TopPlayersEver = () => {
  const [rating, setRating] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    const params = {
      s: 'rating+desc',
      page_size: '5',
      with_bots: false,
    };

    (async () => {
      try {
        const response = await dispatch(
          actions.fetchUsers({ type: 'ever', params }),
        );

        setRating(response.payload.users);
      } catch (e) {
        throw new Error(e.message);
      }
    })();
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
