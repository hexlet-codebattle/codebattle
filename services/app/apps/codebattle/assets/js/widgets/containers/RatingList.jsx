import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from 'react-js-pagination';
import moment from 'moment';
import cn from 'classnames';

import UserInfo from './UserInfo';
import { usersListSelector } from '../selectors';
import { getUsersRatingPage } from '../middlewares/Users';
import Loading from '../components/Loading';

const decorateJoinedDate = str => (moment.utc(str).format('LL'));

const renderSortArrow = (attribute, sortParams) => {
  const { attribute: currentAttribute, direction } = sortParams;
  const classes = attribute === currentAttribute ? `cb-sort-arrow ${direction}` : 'sort-arrows';

  return (<span className={`d-inline-block ${classes}`} />);
};

const renderUser = user => (
  <tr key={user.id}>
    <td className="p-3 align-middle">{user.rank}</td>
    <td className="tex-left p-3 align-middle">
      <UserInfo user={user} />
    </td>
    <td className="p-3 align-middle">{user.rating}</td>
    <td className="p-3 align-middle">{user.gamesPlayed}</td>
    <td className="p-3 align-middle">{user.performance}</td>
    <td className="p-3 align-middle">{decorateJoinedDate(user.insertedAt)}</td>
    <td className="p-3 align-middle">
      { user.githubId
        ? (
          <a className="text-muted" href={`https://github.com/${user.githubName || user.name}`}>
            <span className="h3">
              <i className="fab fa-github" />
            </span>
          </a>
          )
        : (
          <span className="h3">
            <i className="far fa-times-circle" />
          </span>
        )}
    </td>
  </tr>
);

const renderPagination = ({
  pageInfo: {
    pageNumber,
    pageSize,
    totalEntries,
  },
}, setPage) => (
  <Pagination
    activePage={pageNumber}
    itemsCountPerPage={pageSize}
    totalItemsCount={totalEntries}
    pageRangeDisplayed={5}
    onChange={page => {
        setPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    itemClass="page-item"
    linkClass="page-link"
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

const UsersRating = () => {
  const usersRatingPage = useSelector(usersListSelector);
  const storeLoaded = useSelector(state => state.storeLoaded);
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

  const triggerSort = attribute => {
    const direction = sortParams.direction === 'desc' ? 'asc' : 'desc';

    setSortParams({
      attribute,
      direction,
    });
    setPage(1);
  };

  if (!storeLoaded) {
    return <Loading />;
  }

  return (
    <div className="text-center">
      <h2 className="font-weight-normal">Users rating</h2>
      <p>{`Total entries: ${totalEntries}`}</p>

      <ul className="nav nav-pills justify-content-center">
        {periods.map(period => renderFilterPeriodButtons(period, filterParams, setFilterParams, setPage))}
      </ul>

      <div className="form-inline justify-content-start">
        <div className="input-group">
          <div className="input-group-prepend">
            <span className="input-group-text" id="basic-addon1">
              <FontAwesomeIcon icon="search" />
            </span>
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Username"
            aria-label="Username"
            aria-describedby="basic-addon1"
            value={filterParams.name}
            onChange={e => {
              setFilterParams({ ...filterParams, name: e.target.value });
              setPage(1);
            }}
          />
        </div>
        {/* begin select */}
        <div className="form-group ml-auto">
          <label htmlFor="usersPerPage">
            <select
              className="custom-select"
              id="usersPerPage"
              onChange={e => {
                setPageSize(e.target.value);
                setPage(1);
              }}
            >
              <option>20</option>
              <option>30</option>
              <option>40</option>
              <option>50</option>
            </select>
            <span className="ml-2">Users per page</span>
          </label>
        </div>
        {/** end select */}
        <div className="form-check ml-3">
          <label className="form-check-label" htmlFor="withBots">
            <input
              id="withBots"
              className="form-check-input"
              type="checkbox"
              name="with_bots"
              onChange={() => {
                setFilterParams({ ...filterParams, withBots: !filterParams.withBots });
                setPage(1);
              }}
              defaultChecked={withBots}
            />
            With bots
          </label>
        </div>
      </div>
      <table className="table">
        <thead className="text-left">
          <tr>
            <th
              className="p-3 border-0 cursor-pointer"
              onClick={() => triggerSort('rank')}
            >
              Rank
              &nbsp;
              {renderSortArrow('rank', sortParams)}
            </th>
            <th className="p-3 border-0">User</th>
            <th
              className="p-3 border-0 cursor-pointer"
              onClick={() => triggerSort('rating')}
            >
              Rating
              &nbsp;
              {renderSortArrow('rating', sortParams)}
            </th>
            <th
              className="p-3 border-0 cursor-pointer"
              onClick={() => triggerSort('games_played')}
            >
              Games played
              &nbsp;
              {renderSortArrow('games_played', sortParams)}
            </th>
            <th className="p-3 border-0">
              Performance
            </th>
            <th
              className="p-3 border-0 cursor-pointer"
              onClick={() => triggerSort('id')}
            >
              Joined
              &nbsp;
              {renderSortArrow('id', sortParams)}
            </th>
            <th className="p-3 border-0">Github</th>
          </tr>
        </thead>
        <tbody className="text-left">
          {users.map(renderUser)}
        </tbody>
      </table>
      <div>
        {renderPagination(usersRatingPage, setPage)}
      </div>
    </div>
  );
};

export default UsersRating;
