import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import { taskStateCodes } from '../../config/task';
import * as selectors from '../../selectors';
import {
  itemActionClassName,
  itemClassName,
  itemAddClassName,
  MAX_INPUT_ARGUMENTS_COUNT,
  MIN_EXAMPLES_COUNT,
} from '../../utils/builder';

import BuilderActions from './BuilderActions';
import ExamplesTrack from './ExamplesTrack';
import SignatureTrack from './SignatureTrack';

function TaskStateBadge({ state }) {
  const className = cn('badge py-2 mb-2', {
    'badge-danger': state === taskStateCodes.disabled,
    'badge-success': state === taskStateCodes.active,
    'badge-secondary': state === taskStateCodes.draft || state === taskStateCodes.blank,
  });

  if (state === taskStateCodes.moderation) {
    return null;
  }

  return <span className={className}>{state}</span>;
}

function PreviewAssertsPanel({
  clearSuggests,
  createExampleSuggest,

  createInputTypeSuggest,

  deleteExample,
  deleteInputType,

  editExample,
  editInputType,
  editOutputType,
  haveExampleSuggest,

  haveInputSuggest,
  openExampleEditPanel,
  openInputEditPanel,
}) {
  const {
    assertsExamples: examples,
    inputSignature,
    outputSignature,
    state: taskState,
  } = useSelector((state) => state.builder.task);

  const validInputSignature = useSelector(
    (state) => state.builder.validationStatuses.inputSignature[0],
  );
  const validExamples = useSelector((state) => state.builder.validationStatuses.assertsExamples[0]);

  const editable = useSelector(selectors.canEditTask);

  return (
    <div className="d-flex justify-content-between">
      <div className="overflow-auto">
        <h6 className="pl-1">{`Input parameters types (Max ${MAX_INPUT_ARGUMENTS_COUNT}):`}</h6>
        <div className="d-flex">
          <div className="d-flex overflow-auto pb-2">
            <SignatureTrack
              editable={editable}
              handleDelete={deleteInputType}
              handleEdit={editInputType}
              items={inputSignature}
              valid={validInputSignature}
            />
          </div>
          {editable && inputSignature.length !== MAX_INPUT_ARGUMENTS_COUNT && (
            <div className="d-flex mb-2">
              <button
                title="Add input parameter"
                type="button"
                className={cn(itemAddClassName, {
                  'ml-1': inputSignature.length === 0,
                })}
                onClick={haveInputSuggest ? openInputEditPanel : createInputTypeSuggest}
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
                <div className={itemActionClassName} title={`(${outputSignature.type.name})`}>
                  {`(${outputSignature.type.name})`}
                </div>
                {editable && (
                  <button
                    className={`btn ${itemActionClassName} btn-outline-secondary rounded-right`}
                    title="Edit output parameter"
                    type="button"
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
              editable={editable}
              handleDelete={deleteExample}
              handleEdit={editExample}
              items={examples}
              valid={validExamples}
            />
          </div>
          {editable && (
            <div className="d-flex mb-2">
              <button
                disabled={inputSignature.length === 0}
                title="Add example"
                type="button"
                className={cn(itemAddClassName, {
                  'ml-1': examples.length === 0,
                })}
                onClick={haveExampleSuggest ? openExampleEditPanel : createExampleSuggest}
              >
                <FontAwesomeIcon icon={haveExampleSuggest ? 'edit' : 'plus'} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="d-flex flex-column pl-1">
        <TaskStateBadge state={taskState} />
        <BuilderActions clearSuggests={clearSuggests} validExamples={validExamples} />
      </div>
    </div>
  );
}

export default PreviewAssertsPanel;
