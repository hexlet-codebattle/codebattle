import React from 'react';
import moment from 'moment';
import levelToClass from '../../config/levelToClass';
import ResultIcon from './ResultIcon';
import UserInfo from '../../containers/UserInfo';

const CompletedGames = games => (
  <div className="table-responsive">
    <table className="table table-sm">
      <thead>
        <tr>
          <th className="p-3 border-0">Level</th>
          <th className="p-3 border-0">Actions</th>
          <th className="p-3 border-0 text-center" colSpan={2}>
            Players
          </th>
          <th className="p-3 border-0">Duration</th>
          <th className="p-3 border-0">Date</th>
        </tr>
      </thead>
      <tbody>
        {games.map(game => (
          <tr key={game.id}>
            <td className="p-3 align-middle text-nowrap">
              <div>
                <span className={`badge badge-pill badge-${levelToClass[game.level]} mr-1`}>
                  &nbsp;
                </span>
                {game.level}
              </div>
            </td>
            <td className="p-3 align-middle">
              <a
                type="button"
                className="btn btn-info btn-sm"
                href={`/games/${game.id}`}
              >
                Show
              </a>
            </td>
            <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
              <div className="d-flex align-items-center">
                {ResultIcon(game.id, game.players[0], game.players[1])}
                <UserInfo user={game.players[0]} />
              </div>
            </td>
            <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
              <div className="d-flex align-items-center">
                {ResultIcon(game.id, game.players[1], game.players[0])}
                <UserInfo user={game.players[1]} />
              </div>
            </td>
            <td className="p-3 align-middle text-nowrap">
              {moment.duration(game.duration, 'seconds').humanize()}
            </td>
            <td className="p-3 align-middle text-nowrap">
              {moment.utc(game.finishsAt).local().format('YYYY-MM-DD HH:mm')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default CompletedGames;
