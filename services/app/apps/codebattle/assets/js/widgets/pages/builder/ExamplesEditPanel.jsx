import React, { useCallback } from 'react';
import _ from 'lodash';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ExamplesTrack from './ExamplesTrack';
import SignatureTrack from './SignatureTrack';
import useValidationExample from '../../utils/useValidationExample';
import { itemClassName, itemActionClassName } from '../../utils/builder';

function ExampleForm({
  example,
  exampleRef,
  argumentsInputRef,
  validationStatus,
  handleClear,
  handleEdit,
  handleReset,
  handleSubmit,
}) {
  const handleArguments = useCallback(
    event => {
      const data = event.target.value;
      const newExample = _.cloneDeep({ ...example, arguments: data });
      if (exampleRef?.current) {
        exampleRef.current.scrollIntoView({
          behavior: 'smooth', block: 'nearest', inline: 'start',
        });
      }

      handleEdit(newExample);
    },
    [example, exampleRef, handleEdit],
  );
  const handleExpected = useCallback(
    event => {
      const data = event.target.value;
      const newExample = _.cloneDeep({ ...example, expected: data });
      if (exampleRef?.current) {
        exampleRef.current.scrollIntoView({
          behavior: 'smooth', block: 'nearest', inline: 'start',
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
            className={cn(
              'form-control cb-builder-argument-input m-1 rounded-lg',
              {
                'is-invalid': !validationStatus.arguments.valid,
              },
            )}
            value={example?.arguments}
            onChange={handleArguments}
          />
          <div className="invalid-tooltip">
            {validationStatus.arguments.reason}
          </div>
        </div>
        <div className="d-flex position-relative">
          <input
            className={cn(
              'form-control cb-builder-argument-input m-1 rounded-lg',
              {
                'is-invalid': !validationStatus.expected.valid,
              },
            )}
            value={example?.expected}
            onChange={handleExpected}
          />
          <div className="invalid-tooltip">
            {validationStatus.expected.reason}
          </div>
        </div>
      </div>
      <div className="d-flex">
        <button
          type="button"
          className="btn btn-sm m-1 text-white btn-success rounded-lg"
          onClick={handleSubmit}
          disabled={
            !validationStatus.arguments.valid
            || !validationStatus.expected.valid
          }
        >
          Submit
        </button>
        <button
          type="button"
          className="btn btn-sm m-1 mx-1 btn-secondary rounded-lg"
          onClick={handleReset}
        >
          <FontAwesomeIcon icon="redo" />
        </button>
        <button
          type="button"
          className="btn btn-sm m-1 btn-danger rounded-lg"
          onClick={handleClear}
        >
          <FontAwesomeIcon icon="times" />
        </button>
      </div>
    </>
  );
}

function ExamplesEditPanel({
  items,
  argumentsInputRef,
  suggest,
  suggestRef,
  valid = true,
  inputSignature,
  outputSignature,
  handleAdd,
  handleEdit,
  handleDelete,
  handleSubmit,
  handleClear,
}) {
  const handleReset = useCallback(() => {
    const existedExample = items.find(item => item.id === suggest?.id);

    if (existedExample) {
      handleEdit(_.cloneDeep(existedExample));
    } else {
      handleAdd();
    }

    argumentsInputRef.current.focus();
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
              <div className={itemActionClassName}>
                {`(${outputSignature.type.name})`}
              </div>
            </div>
          </div>
          <h6 className="pl-1">Examples: </h6>
          <div className="d-flex mb-2">
            <ExamplesTrack
              items={items}
              selected={suggest}
              selectedRef={suggestRef}
              valid={valid}
              handleAdd={handleAdd}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              handleClear={handleClear}
              editable
            />
          </div>
        </div>
        <div className="d-flex flex-column overflow-auto">
          <h6 className="pl-1">Example Value Edit: </h6>
          <div className="overflow-auto d-flex">
            <ExampleForm
              example={suggest}
              exampleRef={suggestRef}
              argumentsInputRef={argumentsInputRef}
              validationStatus={validationStatus}
              handleEdit={handleEdit}
              handleReset={handleReset}
              handleClear={handleClear}
              handleSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
      <div>
        <button
          type="button"
          className="btn btn-sm rounded-circle"
          onClick={handleClear}
        >
          <FontAwesomeIcon icon="times" />
        </button>
      </div>
    </div>
  );
}

export default ExamplesEditPanel;
