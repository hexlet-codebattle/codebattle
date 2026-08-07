import React, { useCallback } from 'react';

import { Alert } from '@mantine/core';
import isEmpty from 'lodash/isEmpty';
import { useDispatch, useSelector } from 'react-redux';

import i18n from '../../i18n';
import AlertCodes from '../config/alertCodes';
import { gameAlertsSelector } from '../selectors/index';
import { actions } from '../slices';
import { bootstrapAlertColor, darkThemeAlertStyles } from '../ui/alert';

interface Notification {
  status?: string;
  message?: string;
}

const getNotification = (status: unknown): Notification => {
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
    (id: string) => {
      dispatch(actions.deleteAlert(id));
    },
    [dispatch],
  );

  if (isEmpty(alerts)) {
    return <></>;
  }

  return Object.entries(alerts).map(([key, value]) => {
    const result = getNotification(value);

    return (
      <Alert
        withCloseButton
        onClose={() => handleClose(key)}
        key={key}
        color={bootstrapAlertColor(result.status)}
        radius={0}
        mb={0}
        styles={darkThemeAlertStyles(result.status)}
      >
        {result.message}
      </Alert>
    );
  });
}

export default FeedbackAlertNotification;
