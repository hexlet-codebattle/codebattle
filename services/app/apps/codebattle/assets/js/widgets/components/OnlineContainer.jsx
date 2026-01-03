import React from 'react';

import { useSelector } from 'react-redux';

import * as selectors from '../selectors';

function OnlineContainer() {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const count = presenceList ? presenceList.length : 0;

  if (count === 0) return <></>;

  return (
    <span className="d-flex aling-items-center text-muted mr-2">
      {`${count} Online`}
    </span>
  );
}

export default OnlineContainer;
