import React from 'react';

function ShowButton({ type = 'table', url }) {
  return (
    <a
      className={`btn ${type === 'table' ? 'px-4 ml-1' : ''} btn-secondary btn-sm rounded-lg`}
      href={url}
      type="button"
    >
      Show
    </a>
  );
}

export default ShowButton;
