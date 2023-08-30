import React, { memo } from 'react';
import SlackFeedback, { themes } from 'react-slack-feedback';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { actions } from '../slices';
import { currentUserNameSelector } from '../selectors/index';

const sendToServer = (payload, success, error) => fetch('/api/v1/feedback', {
  method: 'POST',
  headers: {
    'Content-type': 'application/json',
    'x-csrf-token': window.csrf_token,
  },
  body: JSON.stringify(payload),
})
  .then(success)
  .catch(error);

function FeedbackWidget() {
  const currentUserName = useSelector(currentUserNameSelector);
  const dispatch = useDispatch();

  const addAlert = status => {
    dispatch(actions.addAlert({ [Date.now()]: status }));
  };
  return (
    <SlackFeedback
      icon={() => (
        <FontAwesomeIcon
          icon={['fas', 'rss']}
          style={{
            color: '#ee3737', width: '20', height: '20', marginRight: '8px',
          }}
        />
      )}
      theme={themes.dark}
      user={currentUserName}
      onSubmit={(payload, success, error) => sendToServer(payload)
        .then(() => {
          addAlert('editSuccess');
          success();
        })
        .catch(() => {
          addAlert('editError');
          error();
        })}
    />
  );
}

export default memo(FeedbackWidget);
