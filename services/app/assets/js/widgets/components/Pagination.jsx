import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

Pagination.propTypes = {
  filter: PropTypes.string,
  pages: PropTypes.arrayOf(PropTypes.number).isRequired,
  currentPage: PropTypes.number.isRequired,
  onChangePage: PropTypes.func.isRequired,
};

Pagination.defaultProps = {};

function Pagination({ filter, pages, currentPage, onChangePage }) {
  return (
    <nav>
      <ul className="pagination">
        {pages.map(page => {
          const isCurrentPage = page === currentPage;

          const classNames = cn('page-item', {
            'active': page === currentPage,
            'disabled': page === currentPage,
          });

          const styles = {
            cursor: isCurrentPage ? 'default' : 'pointer'
          };

          return (
            <li
              className={classNames}
              style={styles}
              key={page}
              onClick={() => !isCurrentPage && onChangePage(page, filter)}
            >
              <a className="page-link">{page}</a>
            </li>
          )
        })}
      </ul>
    </nav>
  );
}

export default Pagination;
