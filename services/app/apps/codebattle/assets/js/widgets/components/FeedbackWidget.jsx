import React, { memo } from 'react';
import SlackFeedback, { themes } from 'react-slack-feedback';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18n from '../../i18n';

import { currentUserNameSelector } from '../selectors/index';

function FeedbackWidget() {
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

  const notificationStyles = notification => cn({
    'alert-success row mb-0 rounded-0 alert-info alert-dismissible fade show': notification === 'editSuccess',
    'alert-danger row mb-0 rounded-0 alert-info alert-dismissible fade show': notification === 'editError',
    alert: true,
  });
  const getNotificationMessage = status => {
    let message;
    switch (status) {
      case 'editSuccess': {
        message = i18n.t('Feedback sent successfully.');
        break;
      }
      default: {
        message = i18n.t('Feedback not sent.');
        break;
      }
    }
    return message;
  };

  const renderAlert = notification => {
    const container = document.querySelector('#game-widget-root');
    const alert = document.createElement('div');
    const button = document.createElement('button');
    const span = document.createElement('span');
    alert.className = notificationStyles(notification);
    button.className = 'close';
    button.setAttribute('data-dismiss', 'alert');
    button.setAttribute('aria-label', 'Close');
    span.setAttribute('aria-hidden', 'true');
    const textNode = document.createTextNode(getNotificationMessage(notification));
    const textNodeSpan = document.createTextNode('×');
    alert.appendChild(textNode);
    span.appendChild(textNodeSpan);
    button.append(span);
    alert.append(button);
    container.insertAdjacentElement('beforebegin', alert);
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
          renderAlert('editSuccess');
          success();
        })
        .catch(() => {
          renderAlert('editError');
          return error();
        })}
    />
  );
}

export default memo(FeedbackWidget);
