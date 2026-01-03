import React from 'react';

import ReactPaginate from 'react-paginate';

function LeaderboardPagination({
  pageInfo: { pageNumber, pageSize, totalEntries },
  setPage,
}) {
  const pageCount = Math.ceil(totalEntries / pageSize);

  return totalEntries > 0 && (
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
      }}
      pageClassName="cb-custom-event-pagination-page-item px-1"
      pageLinkClassName="cb-custom-event-pagination-page-link px-1"
      previousClassName="cb-custom-event-pagination-page-item px-1"
      previousLinkClassName="cb-custom-event-pagination-page-link px-1"
      nextClassName="cb-custom-event-pagination-page-item px-1"
      nextLinkClassName="cb-custom-event-pagination-page-link px-1"
      breakClassName="cb-custom-event-pagination-page-item px-1"
      breakLinkClassName="cb-custom-event-pagination-page-link px-1"
      activeClassName="active"
    />
  );
}

export default LeaderboardPagination;
