import React, { useCallback } from 'react';

import isEmpty from 'lodash/isEmpty';
import Alert from 'react-bootstrap/Alert';
import { useDispatch, useSelector } from 'react-redux';

import i18n from '../../i18n';
import AlertCodes from '../config/alertCodes';
import { gameAlertsSelector } from '../selectors/index';
import { actions } from '../slices';

const getNotification = (status) => {
  switch (status) {
    case AlertCodes.feedbackSendSuccessful: {
      return {
        status: 'success',
        message: i18n.t('Feedback sent successfully.'),
      };
    }
    case AlertCodes.feedbackSendError: {
      return {
        status: 'danger',
        message: i18n.t('Feedback not sent.'),
      };
    }
    default: {
      return {};
    }
  }
};

function FeedbackAlertNotification() {
  const dispatch = useDispatch();
  const alerts = useSelector(gameAlertsSelector);

  const handleClose = useCallback(
    (id) => {
      dispatch(actions.deleteAlert(id));
    },
    [dispatch],
  );

  if (isEmpty(alerts)) {
    return null;
  }

  return Object.entries(alerts).map(([key, value]) => {
    const result = getNotification(value);

    return (
      <Alert
        key={key}
        dismissible
        className="row mb-0 rounded-0 alert alert-info alert-dismissible fade show"
        variant={result.status}
        onClose={() => handleClose(key)}
      >
        {result.message}
      </Alert>
    );
  });
}

export default FeedbackAlertNotification;
