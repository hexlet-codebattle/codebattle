import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from 'react-js-pagination';
import moment from 'moment';
import UserInfo from './UserInfo';
import { getUsersList } from '../selectors';
import * as UsersMiddlewares from '../middlewares/Users';
import Loading from '../components/Loading';

const mapStateToProps = state => ({
  usersRatingPage: getUsersList(state),
});

const mapDispatchToProps = {
  getRatingPage: UsersMiddlewares.getUsersRatingPage,
};

class UsersRating extends React.Component {
  state = {
    sort: {
      attribute: null,
      direction: 'desc',
    },
  }

  componentDidMount() {
    const { getRatingPage } = this.props;

    getRatingPage(1);
  }

  decorateJoinedDate = str => (moment.utc(str).format('LL'))

  renderUser = user => (
    <tr key={user.id}>
      <td className="p-3 align-middle">{user.rank}</td>
      <td className="tex-left p-3 align-middle">
        <UserInfo user={_.omit(user, 'rating')} />
      </td>
      <td className="p-3 align-middle">{user.rating}</td>
      <td className="p-3 align-middle">{user.gamesPlayed}</td>
      <td className="p-3 align-middle">{user.performance}</td>
      <td className="p-3 align-middle">{this.decorateJoinedDate(user.insertedAt)}</td>
      <td className="p-3 align-middle">
        <a className="text-muted" href={`https://github.com/${user.name}`}>
          <span className="h3">
            <i className="fab fa-github" />
          </span>
        </a>
      </td>
    </tr>
  );

  triggerSort = attribute => {
    const { sort: { direction: prevDirection } } = this.state;
    const direction = prevDirection === 'desc' ? 'asc' : 'desc';
    this.state.sort = { direction, attribute };
    const { getRatingPage } = this.props;
    getRatingPage(1, this.filterNode.value, `${attribute}+${direction}`);
  };

  sortArrow = attribute => {
    const { sort: { attribute: currentAttribute, direction } } = this.state;
    const arrowDirection = attribute === currentAttribute ? direction : '';
    return (<span className={`sort-arrow ${arrowDirection}`} />);
  };

  renderPagination = () => {
    const {
      getRatingPage,
      usersRatingPage: {
        pageInfo: {
          pageNumber: activePage,
          pageSize: itemsCountPerPage,
          totalEntries: totalItemsCount,
        },
      },
    } = this.props;

    return (
      <Pagination
        activePage={activePage}
        itemsCountPerPage={itemsCountPerPage}
        totalItemsCount={totalItemsCount}
        pageRangeDisplayed={5}
        onChange={getRatingPage}
        itemClass="page-item"
        linkClass="page-link"
      />
    );
  };

  render() {
    const { usersRatingPage, getRatingPage } = this.props;

    if (!usersRatingPage) {
      return <Loading />;
    }

    return (
      <div className="text-center">
        <h2 className="font-weight-normal">Users rating</h2>
        <p>{`Total: ${usersRatingPage.pageInfo.totalEntries}`}</p>
        <div className="form-inline">
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
              onChange={_.debounce(() => getRatingPage(1, this.filterNode.value), 500)}
              // eslint-disable-next-line react/no-find-dom-node
              ref={c => { this.filterNode = ReactDOM.findDOMNode(c); }}
            />
          </div>
        </div>
        <table className="table">
          <thead className="text-left">
            <tr>
              <th
                className="p-3 border-0"
                onClick={_.debounce(() => this.triggerSort('rank'))}
              >
                Rank
                {this.sortArrow('rank')}
              </th>
              <th className="p-3 border-0">User</th>
              <th
                className="p-3 border-0"
                onClick={_.debounce(() => this.triggerSort('rating'))}
              >
                Rating
                {this.sortArrow('rating')}
              </th>
              <th
                className="p-3 border-0"
                onClick={_.debounce(() => this.triggerSort('games_played'))}
              >
                Games played
                {this.sortArrow('games_played')}
              </th>
              <th className="p-3 border-0">Performance</th>
              <th
                className="p-3 border-0"
                onClick={_.debounce(() => this.triggerSort('id'))}
              >
                Joined
                {this.sortArrow('id')}
              </th>
              <th className="p-3 border-0">Github</th>
            </tr>
          </thead>
          <tbody className="text-left">
            {usersRatingPage.users.map(this.renderUser)}
          </tbody>
        </table>
        <div>
          {this.renderPagination()}
        </div>
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(UsersRating);
