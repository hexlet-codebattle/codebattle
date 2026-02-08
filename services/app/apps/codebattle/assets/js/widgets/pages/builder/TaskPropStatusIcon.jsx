import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Tooltip from 'react-bootstrap/Tooltip';

import OverlayTrigger from '@/components/OverlayTriggerCompat';

import { validationStatuses } from '../../machines/task';
import { isSafari } from '../../utils/browser';

const iconByValidStatus = {
  [validationStatuses.none]: 'circle',
  [validationStatuses.valid]: 'check-circle',
  [validationStatuses.invalid]: 'times-circle',
  [validationStatuses.edited]: 'exclamation-circle',
  [validationStatuses.validation]: ['fas', 'spinner'],
};

const getStatusClassName = (status) => cn('mx-2', {
  'text-success': status === validationStatuses.valid,
  'text-danger': status === validationStatuses.invalid,
  'text-warning cb-loading-icon': status === validationStatuses.validation,
});

function Icon({ status }) {
  return (
    <FontAwesomeIcon
      data-task-prop-status={status}
      className={getStatusClassName(status)}
      icon={iconByValidStatus[status]}
    />
  );
}

function TaskPropStatusIcon({ id, status, reason }) {
  return reason ? (
    <OverlayTrigger
      trigger={isSafari() ? 'click' : 'focus'}
      placement="top"
      overlay={(<Tooltip id={id}>reason</Tooltip>)}
    >
      <span className="cursor-pointer">
        <Icon status={status} />
      </span>
    </OverlayTrigger>
  ) : (<Icon status={status} />);
}

export default TaskPropStatusIcon;
