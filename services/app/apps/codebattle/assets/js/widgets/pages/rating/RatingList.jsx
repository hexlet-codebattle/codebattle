import React, { useState, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import moment from 'moment';
import Pagination from 'react-js-pagination';
import { useSelector, useDispatch } from 'react-redux';

import UserInfo from '../../components/UserInfo';
import { getUsersRatingPage } from '../../middlewares/Users';
import { usersListSelector } from '../../selectors';

const decorateJoinedDate = (str) => moment.utc(str).format('LL');

const renderSortArrow = (attribute, sortParams) => {
  const { attribute: currentAttribute, direction } = sortParams;
  const classes = attribute === currentAttribute ? `cb-sort-arrow ${direction}` : 'sort-arrows';

  return <span className={`d-inline-block ${classes}`} />;
};

const renderUser = (page, pageSize, user, index) => (
  <tr key={user.id}>
    <td className="p-3 align-middle text-nowrap text-muted">
      #{(page - 1) * pageSize + index + 1}
    </td>
    <td className="tex-left p-3 align-middle text-nowrap ">
      <UserInfo truncate user={user} />
    </td>
    <td className="p-3 align-middle text-nowrap ">{user.rank}</td>
    <td className="p-3 align-middle text-nowrap ">{user.rating}</td>
    <td className="p-3 align-middle text-nowrap ">{user.gamesPlayed}</td>
    <td className="p-3 align-middle text-nowrap ">{decorateJoinedDate(user.insertedAt)}</td>
    <td className="p-3 align-middle text-nowrap ">
      {user.githubId ? (
        <a
          className="text-muted text-nowrap "
          href={`https://github.com/${user.githubName || user.name}`}
        >
          <span className="h3">
            <i className="fab fa-github" />
          </span>
        </a>
      ) : (
        <span className="h3">
          <i className="far fa-times-circle" />
        </span>
      )}
    </td>
  </tr>
);

const renderPagination = ({ pageInfo: { pageNumber, pageSize, totalEntries } }, setPage) => (
  <Pagination
    activePage={pageNumber}
    itemClass="page-item"
    itemsCountPerPage={pageSize}
    linkClass="page-link"
    pageRangeDisplayed={5}
    totalItemsCount={totalEntries}
    onChange={(page) => {
      setPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }}
  />
);

const renderFilterPeriodButtons = (period, filterParams, setFilterParams, setPage) => {
  const classes = cn(
    'mr-1 btn nav-link',
    filterParams.period === period ? 'nav-link active' : 'btn-link',
  );

  return (
    <li key={period} className="nav-item">
      <button
        className={classes}
        type="button"
        onClick={() => {
          setFilterParams({ ...filterParams, period });
          setPage(1);
        }}
      >
        {period}
      </button>
    </li>
  );
};

const periods = ['weekly', 'monthly', 'total'];

function UsersRating() {
  const usersRatingPage = useSelector(usersListSelector);
  const dispatch = useDispatch();

  const {
    pageInfo: { totalEntries },
    users,
    withBots,
  } = usersRatingPage;

  const [sortParams, setSortParams] = useState({
    attribute: 'rank',
    direction: 'asc',
  });

  const [filterParams, setFilterParams] = useState({
    name: '',
    period: 'total',
    withBots: false,
  });

  const [pageSize, setPageSize] = useState('20');

  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(getUsersRatingPage(filterParams, sortParams, page, pageSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams, sortParams, page, pageSize]);

  const triggerSort = (attribute) => {
    const direction = sortParams.direction === 'desc' ? 'asc' : 'desc';

    setSortParams({
      attribute,
      direction,
    });
    setPage(1);
  };

  return (
    <div className="text-center">
      <h2 className="font-weight-normal">Users rating</h2>
      <p>{`Total entries: ${totalEntries}`}</p>

      <ul className="nav nav-pills justify-content-center mb-3">
        {periods.map((period) =>
          renderFilterPeriodButtons(period, filterParams, setFilterParams, setPage),
        )}
      </ul>

      <div className="form-inline justify-content-between">
        <div className="input-group mb-3">
          <div className="input-group-prepend">
            <span className="input-group-text" id="basic-addon1">
              <FontAwesomeIcon icon="search" />
            </span>
          </div>
          <input
            aria-describedby="basic-addon1"
            aria-label="Username"
            className="form-control"
            placeholder="Username"
            type="text"
            value={filterParams.name}
            onChange={(e) => {
              setFilterParams({ ...filterParams, name: e.target.value });
              setPage(1);
            }}
          />
        </div>
        <div className="d-flex justify-content-center">
          {/* begin select */}
          <div className="form-group ml-auto mb-3">
            <label htmlFor="usersPerPage">
              <select
                className="custom-select"
                id="usersPerPage"
                onChange={(e) => {
                  setPageSize(e.target.value);
                  setPage(1);
                }}
              >
                <option>20</option>
                <option>30</option>
                <option>40</option>
                <option>50</option>
              </select>
              <span className="ml-2 text-nowrap">Users per page</span>
            </label>
          </div>
          {/** end select */}
          <div className="form-check ml-3 mb-3">
            <label className="form-check-label" htmlFor="withBots">
              <input
                className="form-check-input"
                defaultChecked={withBots}
                id="withBots"
                name="with_bots"
                type="checkbox"
                onChange={() => {
                  setFilterParams({
                    ...filterParams,
                    withBots: !filterParams.withBots,
                  });
                  setPage(1);
                }}
              />
              With bots
            </label>
          </div>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="text-left">
            <tr>
              <th className="p-3 text-nowrap border-0">№</th>
              <th className="p-3 text-nowrap border-0">User</th>
              <th
                className="p-3 border-0 text-nowrap cursor-pointer"
                onClick={() => triggerSort('rank')}
              >
                Rank &nbsp;
                {renderSortArrow('rank', sortParams)}
              </th>
              <th
                className="p-3 text-nowrap border-0 cursor-pointer"
                onClick={() => triggerSort('rating')}
              >
                Rating &nbsp;
                {renderSortArrow('rating', sortParams)}
              </th>
              <th
                className="p-3 text-nowrap border-0 cursor-pointer"
                onClick={() => triggerSort('games_played')}
              >
                Games played &nbsp;
                {renderSortArrow('games_played', sortParams)}
              </th>
              <th
                className="p-3 text-nowrap border-0 cursor-pointer"
                onClick={() => triggerSort('id')}
              >
                Joined &nbsp;
                {renderSortArrow('id', sortParams)}
              </th>
              <th className="p-3 text-nowrap border-0">Github</th>
            </tr>
          </thead>
          <tbody className="text-left">
            {users.map((...args) => renderUser(page, Number(pageSize), ...args))}
          </tbody>
        </table>
      </div>
      <div>{renderPagination(usersRatingPage, setPage)}</div>
    </div>
  );
}

export default UsersRating;
