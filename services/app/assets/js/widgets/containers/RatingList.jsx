import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { Pagination } from 'react-bootstrap';
import UserInfo from './UserInfo';
import { getUsersList } from '../selectors';
import * as UsersMiddlewares from '../middlewares/Users';
import Loading from '../components/Loading';

class UsersRating extends React.Component {
  componentDidMount() {
    const { getRatingPage } = this.props;
    getRatingPage(1);
  }

  rengerUser = (user, index) => {
    const { usersRatingPage: { pageInfo } } = this.props;
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
              <i className="fa fa-github" />
            </span>
          </a>
        </td>
      </tr>
    );
  }

  clickHandler = num => () => {
    const { getRatingPage } = this.props;
    getRatingPage(num);
  }

  renderPagItems = (current, total) => {
    const pages = [];
    let n = 1;
    const fin = current + 5 < total ? current + 5 : total;
    if (current > 6) {
      n = current - 5;
    }
    for (n; n <= fin; n++) {
      pages.push(
        <Pagination.Item key={n} active={n === current} onClick={this.clickHandler(n)}>
          {n}
        </Pagination.Item>,
      );
    }
    return pages;
  }

  renderPaginationUi = () => {
    const {
      usersRatingPage:
      { pageInfo: { page_number: current, total_pages: total } },
    } = this.props;
    return (
      <Pagination>
        <Pagination.Prev onClick={this.clickHandler(current - 1 > 0 ? current - 1 : 1)} />
        {current > 6 ? <Pagination.Item onClick={this.clickHandler(1)}>{1}</Pagination.Item> : ''}
        {current > 6 ? <Pagination.Ellipsis /> : ''}
        {this.renderPagItems(current, total)}
        {total - current > 6 ? <Pagination.Ellipsis /> : ''}
        {total - current > 6 ? <Pagination.Item onClick={this.clickHandler(total)}>{total}</Pagination.Item> : ''}
        <Pagination.Next onClick={this.clickHandler(current + 1 < total ? current + 1 : total)} />
      </Pagination>
    );
  }

  render() {
    const { usersRatingPage } = this.props;
    if (!usersRatingPage) {
      return <Loading />;
    }

    return (
      <div className="text-center">
        <h2 className="font-weight-normal">Users rating</h2>
        <p>
          {`Total: ${usersRatingPage.pageInfo.total_entries}`}
        </p>
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
            {usersRatingPage.users.map(this.rengerUser)}
          </tbody>
        </table>
        {this.renderPaginationUi()}
      </div>
    );
  }
}

const mapStateToProps = state => ({
  usersRatingPage: getUsersList(state),
});

const mapDispatchToProps = {
  getRatingPage: UsersMiddlewares.getUsersRatingPage,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(UsersRating);
