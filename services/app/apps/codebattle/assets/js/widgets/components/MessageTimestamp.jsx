import React, { memo } from 'react';

import moment from 'moment';

const MessageTimestamp = ({ time }) => (
  <span className="text-muted">
    {moment.utc(moment.unix(time)).local().format('hh:mm A')}
  </span>
);

export default memo(MessageTimestamp);
