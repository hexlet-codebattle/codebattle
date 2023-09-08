import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import isEmpty from 'lodash/isEmpty';

import { itemClassName, itemActionClassName, itemAddClassName } from '../../utils/builder';

const getValueText = (value = '') => value || '?';

function ExamplesTrack({
  editable,
  handleAdd,
  handleDelete,
  handleEdit,
  items = [],
  selected = {},
  selectedRef,
  valid = true,
}) {
  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          role="group"
          className={cn(itemClassName, {
            'border-warning': selected?.id === item.id,
            'border-danger': selected?.id !== item.id && !valid,
          })}
        >
          <div ref={selectedRef} className={itemActionClassName} title={`Example: ${item.id}`}>
            {selected?.id === item.id
              ? `${getValueText(selected?.arguments)} -> ${getValueText(selected?.expected)}`
              : `${getValueText(item.arguments)} -> ${getValueText(item.expected)}`}
          </div>
          {editable && selected?.id !== item.id && (
            <>
              <button
                className={`btn ${itemActionClassName} btn-outline-secondary`}
                title={`Edit example: ${item.id}`}
                type="button"
                onClick={() => handleEdit(item)}
              >
                <FontAwesomeIcon icon="pen" />
              </button>
              <button
                className={`btn ${itemActionClassName} btn-outline-danger rounded-right`}
                title={`Remove example: ${item.id}`}
                type="button"
                onClick={() => handleDelete(item)}
              >
                <FontAwesomeIcon icon="trash" />
              </button>
            </>
          )}
        </div>
      ))}
      {!isEmpty(selected) && !items.some((item) => item.id === selected.id) && (
        <div key={selected.id} className={`${itemClassName} border-warning`} role="group">
          <div className={itemActionClassName} title="New Example">
            {`${getValueText(selected.arguments)} -> ${getValueText(selected.expected)}`}
          </div>
        </div>
      )}
      {!isEmpty(selected) && items.some((item) => item.id === selected.id) && (
        <button
          className={itemAddClassName}
          title="Add input parameter"
          type="button"
          onClick={handleAdd}
        >
          <FontAwesomeIcon icon="plus" />
        </button>
      )}
    </>
  );
}

export default ExamplesTrack;
