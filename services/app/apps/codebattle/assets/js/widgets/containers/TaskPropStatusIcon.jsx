import React from 'react';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { validationStatuses } from '../machines/task';

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

const TaskPropStatusIcon = ({ status }) => (
  <FontAwesomeIcon
    data-task-prop-status={status}
    className={getStatusClassName(status)}
    icon={iconByValidStatus[status]}
  />
);

export default TaskPropStatusIcon;
