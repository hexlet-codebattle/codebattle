import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import isEmpty from 'lodash/isEmpty';

import {
  itemActionClassName,
  itemAddClassName,
  itemClassName,
} from '../../utils/builder';

const getName = (name = '') => (name || '?');

const SignatureTrack = ({
  items = [],
  selected = {},
  selectedRef,
  valid = true,
  editable,
  handleAdd,
  handleEdit,
  handleDelete,
}) => (
  <>
    {items.map(item => (
      <div
        key={item.id}
        className={cn(itemClassName, {
          'border-warning': selected.id === item.id,
          'border-danger': selected.id !== item.id && !valid,
        })}
        role="group"
      >
        <div
          ref={selectedRef}
          title={`${item.argumentName} (${item.type.name})`}
          className={itemActionClassName}
        >
          {
            selected?.id === item.id
              ? `${getName(selected.argumentName)} (${selected.type.name})`
              : `${getName(item.argumentName)} (${item.type.name})`
          }
        </div>
        {editable && selected.id !== item.id && (
          <>
            <button
              type="button"
              title={`Edit ${item.argumentName}`}
              className={`btn ${itemActionClassName} btn-outline-secondary`}
              onClick={() => handleEdit(item)}
            >
              <FontAwesomeIcon icon="pen" />
            </button>
            <button
              type="button"
              title={`Delete ${item.argumentName}`}
              className={`btn ${itemActionClassName} btn-outline-danger rounded-right`}
              onClick={() => handleDelete(item)}
            >
              <FontAwesomeIcon icon="trash" />
            </button>
          </>
        )}
      </div>
    ))}
    {!isEmpty(selected) && !items.some(item => item.id === selected.id) && (
      <div key={selected.id} className={`${itemClassName} border-warning`} role="group">
        <div
          title="New input"
          className={itemActionClassName}
        >
          {`${selected.argumentName || '?'} (${selected.type.name})`}
        </div>
      </div>
    )}
    {!isEmpty(selected) && items.some(item => item.id === selected.id) && items.length !== 3 && (
      <button
        type="button"
        title="Add input parameter"
        className={itemAddClassName}
        onClick={handleAdd}
      >
        <FontAwesomeIcon icon="plus" />
      </button>
    )}
  </>
);

export default SignatureTrack;
