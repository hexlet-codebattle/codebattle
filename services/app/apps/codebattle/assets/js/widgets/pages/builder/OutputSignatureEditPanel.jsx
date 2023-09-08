import React, { useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import isEmpty from 'lodash/isEmpty';

import { defaultSignatureByType, argumentTypes, itemActionClassName } from '../../utils/builder';

import SignatureForm from './SignatureForm';

function OutputSignatureEditPanel({ handleClear, handleEdit, handleSubmit, item, suggest }) {
  const handleReset = useCallback(() => {
    if (item) {
      handleEdit(item);
    }

    return handleEdit({ id: suggest.id, ...defaultSignatureByType[argumentTypes.integer] });
  }, [item, suggest, handleEdit]);

  if (isEmpty(suggest)) {
    return null;
  }

  return (
    <div className="d-flex justify-content-between h-100">
      <div className="d-flex flex-column justify-content-between">
        <div className="d-flex flex-column ml-2 overflow-auto">
          <h6 className="pl-1">Output type: </h6>
          <div className="d-flex">
            <div
              key={suggest.id}
              className="btn-group m-1 border-gray border-warning rounded-lg"
              role="group"
            >
              <div className={itemActionClassName} title="New Output">
                {`(${suggest.type.name})`}
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex flex-column overflow-auto ml-2">
          <h6 className="pl-1">Type: </h6>
          <div className="d-flex">
            <div className="overflow-auto d-flex pb-2">
              <SignatureForm handleEdit={handleEdit} signature={suggest} />
            </div>
            <div className="d-flex btn-group pb-2 m-1">
              <button
                className="btn btn-sm text-white btn-success rounded-lg"
                type="button"
                onClick={handleSubmit}
              >
                {item ? 'Update' : 'Submit'}
              </button>
              <button
                className="btn btn-sm mx-2 btn-secondary rounded-lg"
                type="button"
                onClick={handleReset}
              >
                <FontAwesomeIcon icon="redo" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <button className="btn btn-sm rounded-circle" type="button" onClick={handleClear}>
          <FontAwesomeIcon icon="times" />
        </button>
      </div>
    </div>
  );
}

export default OutputSignatureEditPanel;
