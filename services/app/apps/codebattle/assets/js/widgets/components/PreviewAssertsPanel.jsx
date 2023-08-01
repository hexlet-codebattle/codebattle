import React from 'react';
import { useSelector } from 'react-redux';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SignatureTrack from './SignatureTrack';
import ExamplesTrack from './ExamplesTrack';
import BuilderActions from './BuilderActions';
import * as selectors from '../selectors';

import {
  itemActionClassName,
  itemClassName,
  itemAddClassName,
  MAX_INPUT_ARGUMENTS_COUNT,
  MIN_EXAMPLES_COUNT,
} from '../utils/builder';

const PreviewAssertsPanel = ({
  haveInputSuggest,
  haveExampleSuggest,

  clearSuggests,

  openInputEditPanel,
  openExampleEditPanel,

  createInputTypeSuggest,
  editInputType,
  deleteInputType,
  editOutputType,

  createExampleSuggest,
  editExample,
  deleteExample,
}) => {
  const {
    inputSignature,
    outputSignature,
    assertsExamples: examples,
  } = useSelector(state => state.builder.task);

  const validInputSignature = useSelector(
    state => state.builder.validationStatuses.inputSignature[0],
  );
  const validExamples = useSelector(
    state => state.builder.validationStatuses.assertsExamples[0],
  );

  const editable = useSelector(selectors.canEditTask);

  return (
    <div className="d-flex justify-content-between">
      <div className="overflow-auto">
        <h6 className="pl-1">{`Input parameters types (Max ${MAX_INPUT_ARGUMENTS_COUNT}):`}</h6>
        <div className="d-flex">
          <div className="d-flex overflow-auto pb-2">
            <SignatureTrack
              editable={editable}
              items={inputSignature}
              valid={validInputSignature}
              handleEdit={editInputType}
              handleDelete={deleteInputType}
            />
          </div>
          {editable && inputSignature.length !== MAX_INPUT_ARGUMENTS_COUNT && (
            <div className="d-flex mb-2">
              <button
                type="button"
                title="Add input parameter"
                className={cn(itemAddClassName, {
                  'ml-1': inputSignature.length === 0,
                })}
                onClick={
                  haveInputSuggest ? openInputEditPanel : createInputTypeSuggest
                }
              >
                <FontAwesomeIcon icon={haveInputSuggest ? 'edit' : 'plus'} />
              </button>
            </div>
          )}
        </div>
        <h6 className="pl-1">Output parameter type:</h6>
        <div className="d-flex">
          <div className="d-flex overflow-auto pb-2">
            {!!outputSignature && (
              <div className={itemClassName} role="group">
                <div
                  title={`(${outputSignature.type.name})`}
                  className={itemActionClassName}
                >
                  {`(${outputSignature.type.name})`}
                </div>
                {editable && (
                  <button
                    type="button"
                    title="Edit output parameter"
                    className={`btn ${itemActionClassName} btn-outline-secondary rounded-right`}
                    onClick={() => editOutputType({ ...outputSignature })}
                  >
                    <FontAwesomeIcon icon="pen" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <h6 className="pl-1">{`Examples (Min ${MIN_EXAMPLES_COUNT}):`}</h6>
        <div className="d-flex">
          <div className="d-flex overflow-auto pb-2">
            <ExamplesTrack
              items={examples}
              editable={editable}
              valid={validExamples}
              handleEdit={editExample}
              handleDelete={deleteExample}
            />
          </div>
          {editable && (
            <div className="d-flex mb-2">
              <button
                type="button"
                title="Add example"
                className={cn(itemAddClassName, {
                  'ml-1': examples.length === 0,
                })}
                onClick={
                  haveExampleSuggest
                    ? openExampleEditPanel
                    : createExampleSuggest
                }
                disabled={inputSignature.length === 0}
              >
                <FontAwesomeIcon icon={haveExampleSuggest ? 'edit' : 'plus'} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="d-flex flex-column pl-1">
        <BuilderActions
          validExamples={validExamples}
          clearSuggests={clearSuggests}
        />
      </div>
    </div>
  );
};

export default PreviewAssertsPanel;
