import React from 'react';
import SlackFeedback, { themes } from 'react-slack-feedback';
import { useSelector } from 'react-redux';

import { currentUserNameSelector } from '../selectors/index';

const FeedBackWidget = () => {
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
      theme={themes.dark}
      user={currentUserName}
      onSubmit={(payload, success, error) => sendToServer(payload)
        .then(success)
        .catch(error)}
    />
  );
};

export default FeedBackWidget;
