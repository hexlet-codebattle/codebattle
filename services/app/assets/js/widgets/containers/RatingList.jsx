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
}, dispatch) => (
  <Pagination
    activePage={activePage}
    itemsCountPerPage={itemsCountPerPage}
    totalItemsCount={totalItemsCount}
    pageRangeDisplayed={5}
    onChange={page => dispatch(getUsersRatingPage(page))}
    itemClass="page-item"
    linkClass="page-link"
  />
);

const UsersRating = () => {
  const [sort, setSort] = useState({
    attribute: 'rank',
    direction: 'asc',
  });

  const usersRatingPage = useSelector(usersListSelector);
  const storeLoaded = useSelector(state => state.storeLoaded);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getUsersRatingPage(1));
  }, [dispatch]);

  let filterNode;

  const triggerSort = attribute => {
    const direction = sort.direction === 'desc' ? 'asc' : 'desc';

    setSort({
      attribute,
      direction,
    });

    dispatch(getUsersRatingPage(1, filterNode.value, `${attribute}+${direction}`));
  };

  if (!storeLoaded) {
    return <Loading />;
  }

  return (
    <div className="text-center">
      <h2 className="font-weight-normal">Users rating</h2>
      <p>{`Total: ${usersRatingPage.pageInfo.totalEntries}`}</p>
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
            onChange={() => dispatch(getUsersRatingPage(1, filterNode.value))}
            // eslint-disable-next-line react/no-find-dom-node
            ref={c => { filterNode = ReactDOM.findDOMNode(c); }}
          />
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
          {usersRatingPage.users.map(renderUser)}
        </tbody>
      </table>
      <div>
        {renderPagination(usersRatingPage, dispatch)}
      </div>
    </div>
  );
};

export default UsersRating;
