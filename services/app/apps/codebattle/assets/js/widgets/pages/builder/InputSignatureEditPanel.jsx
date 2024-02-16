import React, {
  useMemo,
  useCallback,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import {
  argumentTypes,
  defaultSignatureByType,
} from '../../utils/builder';

import SignatureForm from './SignatureForm';
import SignatureTrack from './SignatureTrack';

function InputSignatureEditPanel({
  items = [],
  argumentNameInputRef,
  suggest,
  suggestRef,
  valid = true,
  handleAdd,
  handleEdit,
  handleDelete,
  handleSubmit,
  handleClear,
}) {
  const handleChangeName = useCallback(event => {
    handleEdit({ ...suggest, argumentName: event.target.value });
    if (suggestRef?.current) {
      suggestRef.current.scrollIntoView({
        behavior: 'smooth', block: 'nearest', inline: 'start',
      });
    }
  }, [suggest, suggestRef, handleEdit]);

  const handleReset = useCallback(() => {
    const existedInputSignature = items.find(item => item.id === suggest?.id);

    if (existedInputSignature) {
      handleEdit(existedInputSignature);
      return;
    }

    handleEdit({ id: Date.now(), ...defaultSignatureByType[argumentTypes.integer] });
    argumentNameInputRef.current.focus();
  }, [suggest, items, handleEdit, argumentNameInputRef]);

  const [validName] = useMemo(() => {
    if (!suggest) {
      return [true, ''];
    }

    if (!suggest.hasOwnProperty('argumentName')) {
      return [false, ''];
    }

    if (suggest.argumentName.length === 0) {
      return [false, ''];
    }

    if (suggest.argumentName.length > 20) {
      return [false, 'Too more symbols'];
    }

    if (!/^[a-z]+$/.test(suggest.argumentName)) {
      return [false, 'Only lowercase latin'];
    }

    if (items.find(item => item.id !== suggest.id && item.argumentName === suggest.argumentName)) {
      return [false, 'Name must be unig'];
    }

    return [true, ''];
  }, [suggest, items]);

  return (
    <div className="d-flex justify-content-between h-100">
      <div className="d-flex flex-column justify-content-between overflow-auto">
        <div>
          <h6 className="pl-1">Input types: </h6>
          <div className="overflow-auto mb-2">
            {suggest && (
              <SignatureTrack
                items={items}
                selected={suggest}
                selectedRef={suggestRef}
                valid={valid}
                handleAdd={handleAdd}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                editable
              />
            )}
          </div>
        </div>
        <div className="d-flex flex-column">
          <div className="d-flex">
            <div className="d-flex flex-column w-25">
              <h6 className="pl-1">Name: </h6>
              <div className="input-group position-relative">
                <input
                  ref={argumentNameInputRef}
                  className={cn(
                    'form-control cb-builder-argument-input m-1 rounded-lg',
                    {
                      'is-invalid': !validName,
                    },
                  )}
                  onChange={handleChangeName}
                  value={suggest?.argumentName || ''}
                />
              </div>
            </div>
            <div className="d-flex flex-column overflow-auto ml-2">
              <h6 className="pl-1">Type: </h6>
              <div className="d-flex">
                <div className="overflow-auto d-flex pb-2">
                  <SignatureForm
                    signature={suggest}
                    handleEdit={handleEdit}
                  />
                </div>
                <div className="d-flex btn-group pb-2 m-1">
                  <button
                    type="button"
                    className="btn btn-sm text-white btn-success rounded-lg"
                    onClick={handleSubmit}
                    disabled={!validName}
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm mx-2 btn-secondary rounded-lg"
                    onClick={handleReset}
                  >
                    <FontAwesomeIcon icon="redo" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger rounded-lg"
                    onClick={handleClear}
                  >
                    <FontAwesomeIcon icon="times" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <button
          type="button"
          title="Clear suggest"
          className="btn btn-sm rounded-circle"
          onClick={handleClear}
        >
          <FontAwesomeIcon icon="times" />
        </button>
      </div>
    </div>
  );
}

export default InputSignatureEditPanel;
