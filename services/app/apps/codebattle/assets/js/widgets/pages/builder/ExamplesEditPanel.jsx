import React, { useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import cloneDeep from 'lodash/cloneDeep';

import { itemClassName, itemActionClassName } from '../../utils/builder';
import useValidationExample from '../../utils/useValidationExample';

import ExamplesTrack from './ExamplesTrack';
import SignatureTrack from './SignatureTrack';

function ExampleForm({
  argumentsInputRef,
  example,
  exampleRef,
  handleClear,
  handleEdit,
  handleReset,
  handleSubmit,
  validationStatus,
}) {
  const handleArguments = useCallback(
    (event) => {
      const data = event.target.value;
      const newExample = cloneDeep({ ...example, arguments: data });
      if (exampleRef?.current) {
        exampleRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        });
      }

      handleEdit(newExample);
    },
    [example, exampleRef, handleEdit],
  );
  const handleExpected = useCallback(
    (event) => {
      const data = event.target.value;
      const newExample = cloneDeep({ ...example, expected: data });
      if (exampleRef?.current) {
        exampleRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        });
      }

      handleEdit(newExample);
    },
    [example, exampleRef, handleEdit],
  );

  return (
    <>
      <div className="d-flex">
        <div className="d-flex position-relative">
          <input
            ref={argumentsInputRef}
            value={example?.arguments || ''}
            className={cn('form-control cb-builder-argument-input m-1 rounded-lg', {
              'is-invalid': !validationStatus.arguments.valid,
            })}
            onChange={handleArguments}
          />
          <div className="invalid-tooltip">{validationStatus.arguments.reason}</div>
        </div>
        <div className="d-flex position-relative">
          <input
            value={example?.expected || ''}
            className={cn('form-control cb-builder-argument-input m-1 rounded-lg', {
              'is-invalid': !validationStatus.expected.valid,
            })}
            onChange={handleExpected}
          />
          <div className="invalid-tooltip">{validationStatus.expected.reason}</div>
        </div>
      </div>
      <div className="d-flex">
        <button
          className="btn btn-sm m-1 text-white btn-success rounded-lg"
          disabled={!validationStatus.arguments.valid || !validationStatus.expected.valid}
          type="button"
          onClick={handleSubmit}
        >
          Submit
        </button>
        <button
          className="btn btn-sm m-1 mx-1 btn-secondary rounded-lg"
          type="button"
          onClick={handleReset}
        >
          <FontAwesomeIcon icon="redo" />
        </button>
        <button
          className="btn btn-sm m-1 btn-danger rounded-lg"
          type="button"
          onClick={handleClear}
        >
          <FontAwesomeIcon icon="times" />
        </button>
      </div>
    </>
  );
}

function ExamplesEditPanel({
  argumentsInputRef,
  handleAdd,
  handleClear,
  handleDelete,
  handleEdit,
  handleSubmit,
  inputSignature,
  items,
  outputSignature,
  suggest,
  suggestRef,
  valid = true,
}) {
  const handleReset = useCallback(() => {
    const existedExample = items.find((item) => item.id === suggest?.id);

    if (existedExample) {
      handleEdit(cloneDeep(existedExample));
    } else {
      handleAdd();
    }

    argumentsInputRef.current?.focus();
  }, [items, suggest, handleAdd, handleEdit, argumentsInputRef]);

  const validationStatus = useValidationExample({
    suggest,
    inputSignature,
    outputSignature,
  });

  return (
    <div className="d-flex justify-content-between h-100">
      <div className="d-flex flex-column justify-content-between overflow-auto">
        <div className="overflow-auto">
          <h6 className="pl-1">{'Input -> Output'}</h6>
          <div className="d-flex mb-2">
            <SignatureTrack items={inputSignature} />
            <div className="text-nowrap align-self-center mr-2">{'->'}</div>
            <div className={itemClassName} role="group">
              <div className={itemActionClassName}>{`(${outputSignature.type.name})`}</div>
            </div>
          </div>
          <h6 className="pl-1">Examples: </h6>
          <div className="d-flex mb-2">
            <ExamplesTrack
              editable
              handleAdd={handleAdd}
              handleClear={handleClear}
              handleDelete={handleDelete}
              handleEdit={handleEdit}
              items={items}
              selected={suggest}
              selectedRef={suggestRef}
              valid={valid}
            />
          </div>
        </div>
        <div className="d-flex flex-column overflow-auto">
          <h6 className="pl-1">Example Value Edit: </h6>
          <div className="overflow-auto d-flex">
            <ExampleForm
              argumentsInputRef={argumentsInputRef}
              example={suggest}
              exampleRef={suggestRef}
              handleClear={handleClear}
              handleEdit={handleEdit}
              handleReset={handleReset}
              handleSubmit={handleSubmit}
              validationStatus={validationStatus}
            />
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

export default ExamplesEditPanel;
