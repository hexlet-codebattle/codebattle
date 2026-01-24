import React, { useState, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import moment from 'moment';
import ReactPaginate from 'react-paginate';
import { useSelector, useDispatch } from 'react-redux';

import UserInfo from '../../components/UserInfo';
import { getUsersRatingPage } from '../../middlewares/Users';
import { usersListSelector } from '../../selectors';

const decorateJoinedDate = (str) => moment.utc(str).format('LL');

const renderSortArrow = (attribute, sortParams) => {
  const { attribute: currentAttribute, direction } = sortParams;
  const classes = attribute === currentAttribute
      ? `cb-sort-arrow ${direction}`
      : 'sort-arrows';

  return <span className={`d-inline-block ${classes}`} />;
};

const renderUser = (page, pageSize, user, index) => (
  <tr key={user.id}>
    <td className="p-3 align-middle text-nowrap text-white cb-border-color">
      #
      {(page - 1) * pageSize + index + 1}
    </td>
    <td className="tex-left p-3 align-middle text-nowrap text-white cb-border-color">
      <UserInfo user={user} truncate />
    </td>
    <td className="p-3 align-middle text-nowrap text-white cb-border-color">
      {user.rank}
    </td>
    <td className="p-3 align-middle text-nowrap text-white cb-border-color">
      {user.points}
    </td>
    <td className="p-3 align-middle text-nowrap text-white cb-border-color">
      {user.rating}
    </td>
    <td className="p-3 align-middle text-nowrap text-white cb-border-color">
      {user.gamesPlayed}
    </td>
    <td className="p-3 align-middle text-nowrap text-white cb-border-color">
      {decorateJoinedDate(user.insertedAt)}
    </td>
    <td className="p-3 align-middle text-nowrap text-white cb-border-color">
      {user.githubId ? (
        <a
          className="text-muted text-nowrap text-white cb-border-color"
          href={`https://github.com/${user.githubName || user.name}`}
          aria-label="Github account"
        >
          <span className="h3">
            <i className="fab fa-github" />
          </span>
        </a>
      ) : (
        <span className="h3 text-white cb-border-color">
          <i className="far fa-times-circle" />
        </span>
      )}
    </td>
  </tr>
);

const renderPagination = (
  { pageInfo: { pageNumber, pageSize, totalEntries } },
  setPage,
) => {
  const pageCount = Math.ceil(totalEntries / pageSize);

  return (
    <ReactPaginate
      forcePage={pageNumber - 1}
      pageCount={pageCount}
      pageRangeDisplayed={5}
      marginPagesDisplayed={1}
      previousLabel="<"
      nextLabel=">"
      breakLabel="..."
      onPageChange={({ selected }) => {
        setPage(selected + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      pageClassName="page-item"
      pageLinkClassName="page-link"
      previousClassName="page-item"
      previousLinkClassName="page-link"
      nextClassName="page-item"
      nextLinkClassName="page-link"
      breakClassName="page-item"
      breakLinkClassName="page-link"
      activeClassName="active"
    />
  );
};

const renderFilterPeriodButtons = (
  period,
  filterParams,
  setFilterParams,
  setPage,
) => {
  const classes = cn(
    'mr-1 btn nav-link',
    filterParams.period === period ? 'nav-link active' : 'btn-link',
  );

  return (
    <li key={period} className="nav-item">
      <button
        type="button"
        className={classes}
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
    <div className="text-center cb-bg-panel cb-rounded p-3">
      <h2 className="font-weight-normal">Users rating</h2>
      <p>{`Total entries: ${totalEntries}`}</p>

      <ul className="nav nav-pills justify-content-center mb-3">
        {periods.map((period) => renderFilterPeriodButtons(
            period,
            filterParams,
            setFilterParams,
            setPage,
          ))}
      </ul>

      <div className="form-inline justify-content-between">
        <div className="input-group mb-3">
          <div className="input-group-prepend">
            <span
              className="input-group-text cb-bg-highlight-panel cb-border-color text-white"
              id="basic-addon1"
            >
              <FontAwesomeIcon icon="search" />
            </span>
          </div>
          <input
            type="text"
            className="form-control cb-bg-panel cb-border-color text-white"
            placeholder="Username contains…"
            aria-label="Username"
            aria-describedby="basic-addon1"
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
                className="custom-select cb-bg-panel cb-border-color text-white"
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
                id="withBots"
                className="form-check-input"
                type="checkbox"
                name="with_bots"
                onChange={() => {
                  setFilterParams({
                    ...filterParams,
                    withBots: !filterParams.withBots,
                  });
                  setPage(1);
                }}
                defaultChecked={withBots}
              />
              With bots
            </label>
          </div>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="text-left cb-text-light">
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
                className="p-3 border-0 text-nowrap cursor-pointer"
                onClick={() => triggerSort('points')}
              >
                Points &nbsp;
                {renderSortArrow('points', sortParams)}
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
