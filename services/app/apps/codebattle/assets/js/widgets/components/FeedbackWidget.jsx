import React, { memo } from 'react';
import SlackFeedback, { themes } from 'react-slack-feedback';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { currentUserNameSelector } from '../selectors/index';

const FeedbackWidget = memo(() => {
  const currentUserName = useSelector(currentUserNameSelector);

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
        .then(success)
        .catch(error)}
    />
  );
});

export default FeedbackWidget;
