import React from 'react';

import Pagination from 'react-js-pagination';

const LeaderboardPagination = ({
  pageInfo: { pageNumber, pageSize, totalEntries },
  setPage,
}) => (
  <Pagination
    activePage={pageNumber}
    itemsCountPerPage={pageSize}
    totalItemsCount={totalEntries}
    pageRangeDisplayed={5}
    prevPageText="<"
    firstPageText="<<"
    lastPageText=">>"
    nextPageText=">"
    onChange={page => {
      setPage(page);
    }}
    itemClass="cb-custom-event-pagination-page-item px-1"
    linkClass="cb-custom-event-pagination-page-link px-1"
  />
);

export default LeaderboardPagination;
