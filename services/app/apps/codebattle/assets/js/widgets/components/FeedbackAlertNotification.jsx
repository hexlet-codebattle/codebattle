import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Alert from 'react-bootstrap/Alert';
import i18n from '../../i18n';

import { actions } from '../slices';
import { gameAlertsSelector } from '../selectors/index';

const FeedbackAlertNotification = () => {
  const alerts = useSelector(gameAlertsSelector);
  const dispatch = useDispatch();
  const getNotification = status => {
    const notification = {};
    switch (status) {
      case 'editSuccess': {
        notification.status = 'success';
        notification.message = i18n.t('Feedback sent successfully.');
        break;
      }
      default: {
        notification.status = 'danger';
        notification.message = i18n.t('Feedback not sent.');
        break;
      }
    }
    return notification;
  };
  const handleClose = id => {
    dispatch(actions.deleteAlert(id));
  };
  return Object.entries(alerts).map(([key, value]) => {
    const result = getNotification(value);
    return (
      <Alert
        dismissible
        onClose={() => handleClose(key)}
        key={key}
        variant={result.status}
        className="row mb-0 rounded-0 alert alert-info alert-dismissible fade show"
      >
        {result.message}
      </Alert>
    );
  })
};

export default FeedbackAlertNotification;
