import React, { useContext, memo } from 'react';

import { useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import { taskStateSelector } from '../../machines/selectors';
import {
  validationStatuses,
  mapStateToValidationStatus,
  getGeneratorStatus,
} from '../../machines/task';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import TaskPropStatusIcon from './TaskPropStatusIcon';

function BuilderStatus() {
  const { taskService } = useContext(RoomContext);

  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);

  const [isValidName, invalidNameReason] = useSelector(
    (state) => state.builder.validationStatuses.name,
  );
  const [isValidDescription, invalidDescriptionReason] = useSelector(
    (state) => state.builder.validationStatuses.description,
  );
  const [isValidInputSignature, invalidInputReason] = useSelector(
    (state) => state.builder.validationStatuses.inputSignature,
  );
  const [isValidExamples, invalidExamplesReason] = useSelector(
    (state) => state.builder.validationStatuses.assertsExamples,
  );
  const [isValidArgumentsGenerator, invalidArgumentsGeneratorReason] = useSelector(
    (state) => state.builder.validationStatuses.argumentsGenerator,
  );
  const [isValidSolution, invalidSolutionReason] = useSelector(
    (state) => state.builder.validationStatuses.solution,
  );

  const templateState = useSelector((state) => state.builder.templates.state);

  return (
    <div className="p-3">
      <p className="small">
        <TaskPropStatusIcon
          id="statusName"
          reason={invalidNameReason}
          status={isValidName ? validationStatuses.valid : validationStatuses.invalid}
        />
        Name
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusDescription"
          reason={invalidDescriptionReason}
          status={isValidDescription ? validationStatuses.valid : validationStatuses.invalid}
        />
        Description
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusSignature"
          reason={invalidInputReason}
          status={
            !isValidInputSignature
              ? validationStatuses.invalid
              : mapStateToValidationStatus[taskCurrent.value]
          }
        />
        Type Signatures
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusExamples"
          reason={invalidExamplesReason}
          status={
            !isValidExamples
              ? validationStatuses.invalid
              : mapStateToValidationStatus[taskCurrent.value]
          }
        />
        Examples
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusArgumentsGenerator"
          reason={invalidArgumentsGeneratorReason}
          status={
            !isValidArgumentsGenerator
              ? validationStatuses.invalid
              : getGeneratorStatus(templateState, taskCurrent)
          }
        />
        Input arguments generator
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusSolution"
          reason={invalidSolutionReason}
          status={
            !isValidSolution
              ? validationStatuses.invalid
              : getGeneratorStatus(templateState, taskCurrent)
          }
        />
        Solution Example
      </p>
    </div>
  );
}

export default memo(BuilderStatus);
