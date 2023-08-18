import React from 'react';

function ShowButton({ url, type = 'table' }) {
  return (
    <a
      type="button"
      className={`btn ${
        type === 'table' ? 'px-4 ml-1' : ''
      } btn-secondary btn-sm rounded-lg`}
      href={url}
    >
      Show
    </a>
  );
}

export default ShowButton;
