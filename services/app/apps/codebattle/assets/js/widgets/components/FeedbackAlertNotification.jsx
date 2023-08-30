import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import isEmpty from 'lodash/isEmpty';
import Alert from 'react-bootstrap/Alert';
import i18n from '../../i18n';

import { actions } from '../slices';
import { gameAlertsSelector } from '../selectors/index';

const getNotification = status => {
  switch (status) {
    case 'editSuccess': {
      return {
        status: 'success',
        message: i18n.t('Feedback sent successfully.'),
      };
    }
    case 'editError': {
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

  const handleClose = useCallback(id => {
    dispatch(actions.deleteAlert(id));
  }, [dispatch]);

  if (isEmpty(alerts)) {
    return <></>;
  }

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
  });
}

export default FeedbackAlertNotification;
