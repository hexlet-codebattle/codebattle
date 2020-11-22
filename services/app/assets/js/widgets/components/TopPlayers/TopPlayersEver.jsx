import React, { useEffect, useState } from 'react';
import qs from 'qs';
import axios from 'axios';
import UserInfo from '../../containers/UserInfo';

const TopPlayersEver = () => {
  const [rating, setRating] = useState(null);

  useEffect(() => {
    const queryParamsString = qs.stringify({
      s: 'rating+desc',
      page_size: '5',
      with_bots: false,
    });

    axios
      .get(`/api/v1/users?${queryParamsString}`)
      .then(res => {
        const { data: { users } } = res;
        setRating(users);
      });
  }, []);

  return (
    <table className="table table-striped table-borderless border border-dark m-0">
      <thead>
        <tr className="bg-gray">
          <th scope="col" className="text-uppercase p-1" colSpan="2">
            <img alt="rating" src="/assets/images/topPlayers.svg" className="m-2" />
            <span>Leaderboard</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rating && rating.map(item => (
          <tr key={item.name}>
            <td className="pr-0"><UserInfo user={item} truncate /></td>
            <td className="text-right pl-0">{item.rating}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TopPlayersEver;
