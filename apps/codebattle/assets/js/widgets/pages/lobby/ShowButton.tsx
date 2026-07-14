import React from 'react';

interface ShowButtonProps {
  url: string;
  type?: string;
}

function ShowButton({ url, type = 'table' }: ShowButtonProps) {
  return (
    <a
      type="button"
      className={`btn ${type === 'table' ? 'px-4 ml-1' : ''} btn-secondary btn-sm rounded-lg`}
      href={url}
    >
      Show
    </a>
  );
}

export default ShowButton;
