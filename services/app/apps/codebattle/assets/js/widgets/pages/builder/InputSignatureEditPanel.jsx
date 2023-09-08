import React, { useMemo, useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import { argumentTypes, defaultSignatureByType } from '../../utils/builder';

import SignatureForm from './SignatureForm';
import SignatureTrack from './SignatureTrack';

function InputSignatureEditPanel({
  argumentNameInputRef,
  handleAdd,
  handleClear,
  handleDelete,
  handleEdit,
  handleSubmit,
  items = [],
  suggest,
  suggestRef,
  valid = true,
}) {
  const handleChangeName = useCallback(
    (event) => {
      handleEdit({ ...suggest, argumentName: event.target.value });
      if (suggestRef?.current) {
        suggestRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        });
      }
    },
    [suggest, suggestRef, handleEdit],
  );

  const handleReset = useCallback(() => {
    const existedInputSignature = items.find((item) => item.id === suggest?.id);

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

    if (suggest.argumentName.length === 0) {
      return [false, ''];
    }

    if (suggest.argumentName.length > 20) {
      return [false, 'Too more symbols'];
    }

    if (!/^[a-z]+$/.test(suggest.argumentName)) {
      return [false, 'Only lowercase latin'];
    }

    if (
      items.find((item) => item.id !== suggest.id && item.argumentName === suggest.argumentName)
    ) {
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
                editable
                handleAdd={handleAdd}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
                items={items}
                selected={suggest}
                selectedRef={suggestRef}
                valid={valid}
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
                  value={suggest?.argumentName || ''}
                  className={cn('form-control cb-builder-argument-input m-1 rounded-lg', {
                    'is-invalid': !validName,
                  })}
                  onChange={handleChangeName}
                />
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
                    disabled={!validName}
                    type="button"
                    onClick={handleSubmit}
                  >
                    Submit
                  </button>
                  <button
                    className="btn btn-sm mx-2 btn-secondary rounded-lg"
                    type="button"
                    onClick={handleReset}
                  >
                    <FontAwesomeIcon icon="redo" />
                  </button>
                  <button
                    className="btn btn-sm btn-danger rounded-lg"
                    type="button"
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
          className="btn btn-sm rounded-circle"
          title="Clear suggest"
          type="button"
          onClick={handleClear}
        >
          <FontAwesomeIcon icon="times" />
        </button>
      </div>
    </div>
  );
}

export default InputSignatureEditPanel;
