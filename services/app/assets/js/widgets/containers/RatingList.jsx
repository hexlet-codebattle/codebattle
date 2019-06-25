import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import _ from 'lodash';
import Pagination from '../components/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
  componentDidMount() {
    const { getRatingPage } = this.props;

    getRatingPage(1);
  }

  renderUser = (user, index) => {
    const {
      usersRatingPage: { pageInfo },
    } = this.props;

    return (
      <tr key={user.id}>
        <td className="p-3 align-middle">
          {pageInfo.page_number > 1
            ? index + 1 + (pageInfo.page_number - 1) * pageInfo.page_size
            : index + 1}
        </td>
        <td className="tex-left p-3 align-middle">
          <UserInfo user={_.omit(user, 'rating')} />
        </td>
        <td className="p-3 align-middle">{user.rating}</td>
        <td className="p-3 align-middle">{user.game_count}</td>
        <td className="p-3 align-middle">
          <a className="text-muted" href={`https://github.com/${user.name}`}>
            <span className="h3">
              <i className="fab fa-github" />
            </span>
          </a>
        </td>
      </tr>
    );
  };

  renderPaginationUi = () => {
    const {
      getRatingPage,
      usersRatingPage: {
        pageInfo: { page_number: currentPage, total_pages: total },
      },
    } = this.props;

    const filter = !!this._filter ? this._filter.value : '';
    const pages = _.range(1, total + 1);

    return (
      <Pagination
        filter={filter}
        pages={pages}
        currentPage={currentPage}
        onChangePage={getRatingPage}
      />
    )
  };

  render() {
    const { usersRatingPage, getRatingPage } = this.props;

    if (!usersRatingPage) {
      return <Loading />;
    }

    return (
      <div className="text-center">
        <h2 className="font-weight-normal">Users rating</h2>
        <p>{`Total: ${usersRatingPage.pageInfo.total_entries}`}</p>
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
              onChange={_.debounce(() => getRatingPage(1, this._filter.value), 500)}
              ref={c => this._filter = ReactDOM.findDOMNode(c)}
            />
          </div>
        </div>
        <table className="table">
          <thead className="text-left">
            <tr>
              <th className="p-3 border-0">Rank</th>
              <th className="p-3 border-0">User</th>
              <th className="p-3 border-0">Rating</th>
              <th className="p-3 border-0">Games played</th>
              <th className="p-3 border-0">Github</th>
            </tr>
          </thead>
          <tbody className="text-left">
            {usersRatingPage.users.map(this.renderUser)}
          </tbody>
        </table>
        {this.renderPaginationUi()}
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(UsersRating);
