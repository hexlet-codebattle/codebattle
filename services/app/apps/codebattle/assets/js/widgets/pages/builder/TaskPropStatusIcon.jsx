import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import { validationStatuses } from '../../machines/task';
import isSafari from '../../utils/browser';

const iconByValidStatus = {
  [validationStatuses.none]: 'circle',
  [validationStatuses.valid]: 'check-circle',
  [validationStatuses.invalid]: 'times-circle',
  [validationStatuses.edited]: 'exclamation-circle',
  [validationStatuses.validation]: ['fas', 'spinner'],
};

const getStatusClassName = (status) =>
  cn('mx-2', {
    'text-success': status === validationStatuses.valid,
    'text-danger': status === validationStatuses.invalid,
    'text-warning cb-loading-icon': status === validationStatuses.validation,
    'text-black-50': status === validationStatuses.none || status === validationStatuses.edited,
  });

function Icon({ status }) {
  return (
    <FontAwesomeIcon
      className={getStatusClassName(status)}
      data-task-prop-status={status}
      icon={iconByValidStatus[status]}
    />
  );
}

function TaskPropStatusIcon({ id, reason, status }) {
  return reason ? (
    <OverlayTrigger
      overlay={<Tooltip id={id}>reason</Tooltip>}
      placement="top"
      trigger={isSafari() ? 'click' : 'focus'}
    >
      <span className="cursor-pointer">
        <Icon status={status} />
      </span>
    </OverlayTrigger>
  ) : (
    <Icon status={status} />
  );
}

export default TaskPropStatusIcon;
