import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import isEmpty from 'lodash/isEmpty';

import { itemActionClassName, itemAddClassName, itemClassName } from '../../utils/builder';

const getName = (name = '') => name || '?';

function SignatureTrack({
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
            'border-warning': selected.id === item.id,
            'border-danger': selected.id !== item.id && !valid,
          })}
        >
          <div
            ref={selectedRef}
            className={itemActionClassName}
            title={`${item.argumentName} (${item.type.name})`}
          >
            {selected?.id === item.id
              ? `${getName(selected.argumentName)} (${selected.type.name})`
              : `${getName(item.argumentName)} (${item.type.name})`}
          </div>
          {editable && selected.id !== item.id && (
            <>
              <button
                className={`btn ${itemActionClassName} btn-outline-secondary`}
                title={`Edit ${item.argumentName}`}
                type="button"
                onClick={() => handleEdit(item)}
              >
                <FontAwesomeIcon icon="pen" />
              </button>
              <button
                className={`btn ${itemActionClassName} btn-outline-danger rounded-right`}
                title={`Delete ${item.argumentName}`}
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
          <div className={itemActionClassName} title="New input">
            {`${selected.argumentName || '?'} (${selected.type.name})`}
          </div>
        </div>
      )}
      {!isEmpty(selected) &&
        items.some((item) => item.id === selected.id) &&
        items.length !== 3 && (
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

export default SignatureTrack;
