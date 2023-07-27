import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import _ from 'lodash';
import cn from 'classnames';
import {
  itemClassName,
  itemActionClassName,
  itemAddClassName,
} from '../utils/builder';

const getValueText = (value = '') => (value || '?');

const ExamplesTrack = ({
  items = [],
  selected = {},
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
          'border-warning': selected?.id === item.id,
          'border-danger': selected?.id !== item.id && !valid,
        })}
        role="group"
      >
        <div
          title={`Example: ${item.id}`}
          className={itemActionClassName}
        >
          {
            selected?.id === item.id
              ? `${getValueText(selected?.arguments)} -> ${getValueText(selected?.expected)}`
              : `${getValueText(item.arguments)} -> ${getValueText(item.expected)}`
          }
        </div>
        {editable && selected?.id !== item.id && (
          <>
            <button
              type="button"
              title={`Edit example: ${item.id}`}
              className={`btn ${itemActionClassName} btn-outline-secondary`}
              onClick={() => handleEdit(item)}
            >
              <FontAwesomeIcon icon="pen" />
            </button>
            <button
              type="button"
              title={`Remove example: ${item.id}`}
              className={`btn ${itemActionClassName} btn-outline-danger rounded-right`}
              onClick={() => handleDelete(item)}
            >
              <FontAwesomeIcon icon="trash" />
            </button>
          </>
        )}
      </div>
    ))}
    {!_.isEmpty(selected) && !items.some(item => item.id === selected.id) && (
      <div
        key={selected.id}
        className={`${itemClassName} border-warning`}
        role="group"
      >
        <div
          title="New Example"
          className={itemActionClassName}
        >
          {`${getValueText(selected.arguments)} -> ${getValueText(selected.expected)}`}
        </div>
      </div>
    )}
    {!_.isEmpty(selected) && items.some(item => item.id === selected.id) && (
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

export default ExamplesTrack;
