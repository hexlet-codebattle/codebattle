import React from 'react';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { validationStatuses } from '../../machines/task';
import isSafari from '../../utils/browser';

const iconByValidStatus = {
  [validationStatuses.none]: 'circle',
  [validationStatuses.valid]: 'check-circle',
  [validationStatuses.invalid]: 'times-circle',
  [validationStatuses.edited]: 'exclamation-circle',
  [validationStatuses.validation]: ['fas', 'spinner'],
};

const getStatusClassName = status => cn('mx-2', {
  'text-success': status === validationStatuses.valid,
  'text-danger': status === validationStatuses.invalid,
  'text-warning cb-loading-icon': status === validationStatuses.validation,
  'text-black-50': status === validationStatuses.none || status === validationStatuses.edited,
});

const Icon = ({ status }) => (
  <FontAwesomeIcon
    data-task-prop-status={status}
    className={getStatusClassName(status)}
    icon={iconByValidStatus[status]}
  />
);

const TaskPropStatusIcon = ({ id, status, reason }) => (
  reason ? (
    <OverlayTrigger
      trigger={isSafari() ? 'click' : 'focus'}
      placement="top"
      overlay={(<Tooltip id={id}>reason</Tooltip>)}
    >
      <span className="cursor-pointer">
        <Icon status={status} />
      </span>
    </OverlayTrigger>
  ) : (<Icon status={status} />)
);

export default TaskPropStatusIcon;
