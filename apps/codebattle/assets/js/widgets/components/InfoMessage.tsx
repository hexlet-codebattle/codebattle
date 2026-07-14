import React from 'react';

import moment from 'moment';

interface InfoMessageProps {
  text: string;
  time?: number | null;
}

function InfoMessage({ text, time }: InfoMessageProps) {
  return (
    <div className="d-flex align-items-baseline flex-wrap">
      <small className="text-muted text-small">{text}</small>
      <small className="text-muted text-small ml-auto">
        {time ? moment.unix(time).format('HH:mm:ss') : ''}
      </small>
    </div>
  );
}

export default InfoMessage;
