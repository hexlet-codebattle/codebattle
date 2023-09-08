import React, { useCallback, memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import SlackFeedback, { themes } from 'react-slack-feedback';

import AlertCodes from '../config/alertCodes';
import { currentUserNameSelector } from '../selectors/index';
import { actions } from '../slices';

const sendToServer = (payload, success, error) =>
  fetch('/api/v1/feedback', {
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
  const dispatch = useDispatch();

  const currentUserName = useSelector(currentUserNameSelector);

  const addAlert = useCallback(
    (status) => {
      dispatch(actions.addAlert({ [Date.now()]: status }));
    },
    [dispatch],
  );

  return (
    <SlackFeedback
      theme={themes.dark}
      user={currentUserName}
      icon={() => (
        <FontAwesomeIcon
          icon={['fas', 'rss']}
          style={{
            color: '#ee3737',
            width: '20',
            height: '20',
            marginRight: '8px',
          }}
        />
      )}
      onSubmit={(payload, success, error) =>
        sendToServer(payload)
          .then(() => {
            addAlert(AlertCodes.feedbackSendSuccessful);
            success();
          })
          .catch(() => {
            addAlert(AlertCodes.feedbackSendError);
            error();
          })
      }
    />
  );
}

export default memo(FeedbackWidget);
