import React from 'react';

import cn from 'classnames';

function SystemMessage({ text, meta }) {
  const statusClassName = cn('text-small', {
    'text-danger': ['error', 'failure'].includes(meta?.status),
    'text-success': meta?.status === 'success',
    'text-muted': meta?.status === 'event',
  });

  return (
    <div className="d-flex align-items-baseline flex-wrap">
      <small className={statusClassName}>{text}</small>
    </div>
  );
}

export default SystemMessage;
