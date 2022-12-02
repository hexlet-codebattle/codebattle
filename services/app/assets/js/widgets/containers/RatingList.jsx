import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from 'react-js-pagination';
import moment from 'moment';
import UserInfo from './UserInfo';
import { usersListSelector } from '../selectors';
import { getUsersRatingPage } from '../middlewares/Users';
import Loading from '../components/Loading';

const decorateJoinedDate = str => (moment.utc(str).format('LL'));

const renderSortArrow = (attribute, sort) => {
  const { attribute: currentAttribute, direction } = sort;
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
      <a className="text-muted" href={`https://github.com/${user.name}`}>
        <span className="h3">
          <i className="fab fa-github" />
        </span>
      </a>
    </td>
  </tr>
);

const renderPagination = ({
  pageInfo: {
    pageNumber: activePage,
    pageSize: itemsCountPerPage,
    totalEntries: totalItemsCount,
  },
  dateFrom,
  withBots,
}, dispatch) => (
  <Pagination
    activePage={activePage}
    itemsCountPerPage={itemsCountPerPage}
    totalItemsCount={totalItemsCount}
    pageRangeDisplayed={5}
    onChange={page => dispatch(getUsersRatingPage(dateFrom, withBots, page))}
    itemClass="page-item"
    linkClass="page-link"
  />
);

const getActiveModeByDateFrom = dateFrom => {
  if (!dateFrom) return 'total';
  if (moment.utc(dateFrom) <= moment().startOf('month')) return 'monthly';

  return 'weekly';
};

const getDateFromByNavItem = navItem => {
  if (navItem === 'weekly') return moment().startOf('week').utc().format('YYYY-MM-DD');
  if (navItem === 'monthly') return moment().startOf('month').utc().format('YYYY-MM-DD');

  return null;
};

const renderRatingModeNavItem = (navItem, activeMode, withBots, dispatch) => {
  const dateFrom = getDateFromByNavItem(navItem);
  const classes = activeMode === navItem ? 'btn nav-link active' : 'btn btn-link nav-link';

  return (
    <li key={navItem} className="nav-item">
      <button type="button" className={classes} onClick={() => dispatch(getUsersRatingPage(dateFrom, withBots))}>{navItem}</button>
    </li>
  );
};

const UsersRating = () => {
  const [sort, setSort] = useState({
    attribute: 'rank',
    direction: 'asc',
  });
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getUsersRatingPage(null, true, 1));
  }, [dispatch]);

  const usersRatingPage = useSelector(usersListSelector);
  const storeLoaded = useSelector(state => state.storeLoaded);

  const {
    pageInfo: { totalEntries },
    users,
    dateFrom,
    withBots,
  } = usersRatingPage;


  let filterNode;

  const triggerSort = attribute => {
    const direction = sort.direction === 'desc' ? 'asc' : 'desc';

    setSort({
      attribute,
      direction,
    });

    dispatch(getUsersRatingPage(dateFrom, withBots, 1, filterNode.value, `${attribute}+${direction}`));
  };

  if (!storeLoaded) {
    return <Loading />;
  }

  const ratingModes = ['weekly', 'monthly', 'total'];

  return (
    <div className="text-center">
      <h2 className="font-weight-normal">Users rating</h2>
      <p>{`Total entries: ${totalEntries}`}</p>

      <ul className="nav nav-pills justify-content-center">
        {ratingModes.map(item => renderRatingModeNavItem(item, getActiveModeByDateFrom(dateFrom), withBots, dispatch))}
      </ul>

      <div className="form-inline justify-content-between">
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
            onChange={() => dispatch(getUsersRatingPage(dateFrom, withBots, 1, filterNode.value))}
            // eslint-disable-next-line react/no-find-dom-node
            ref={c => { filterNode = ReactDOM.findDOMNode(c); }}
          />
        </div>
        <div className="form-check">
          <label className="form-check-label" htmlFor="withBots">
            <input
              id="withBots"
              className="form-check-input"
              type="checkbox"
              name="with_bots"
              onChange={() => dispatch(getUsersRatingPage(dateFrom, !withBots, 1, filterNode.value))}
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
              {renderSortArrow('rank', sort)}
            </th>
            <th className="p-3 border-0">User</th>
            <th
              className="p-3 border-0 cursor-pointer"
              onClick={() => triggerSort('rating')}
            >
              Rating
              &nbsp;
              {renderSortArrow('rating', sort)}
            </th>
            <th
              className="p-3 border-0 cursor-pointer"
              onClick={() => triggerSort('games_played')}
            >
              Games played
              &nbsp;
              {renderSortArrow('games_played', sort)}
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
              {renderSortArrow('id', sort)}
            </th>
            <th className="p-3 border-0">Github</th>
          </tr>
        </thead>
        <tbody className="text-left">
          {users.map(renderUser)}
        </tbody>
      </table>
      <div>
        {renderPagination(usersRatingPage, dispatch)}
      </div>
    </div>
  );
};

export default UsersRating;
