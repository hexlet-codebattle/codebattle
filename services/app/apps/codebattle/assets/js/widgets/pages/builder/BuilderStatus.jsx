import React, { useContext, memo } from 'react';
import { useSelector } from 'react-redux';
import { taskStateSelector } from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';
import {
  validationStatuses,
  mapStateToValidationStatus,
  getGeneratorStatus,
} from '../../machines/task';
import RoomContext from '../../components/RoomContext';
import TaskPropStatusIcon from './TaskPropStatusIcon';

const BuilderStatus = memo(() => {
  const { taskService } = useContext(RoomContext);

  const taskCurrent = useMachineStateSelector(taskService, taskStateSelector);

  const [isValidName, invalidNameReason] = useSelector(
    state => state.builder.validationStatuses.name,
  );
  const [isValidDescription, invalidDescriptionReason] = useSelector(
    state => state.builder.validationStatuses.description,
  );
  const [isValidInputSignature, invalidInputReason] = useSelector(
    state => state.builder.validationStatuses.inputSignature,
  );
  const [isValidExamples, invalidExamplesReason] = useSelector(
    state => state.builder.validationStatuses.assertsExamples,
  );
  const [
    isValidArgumentsGenerator,
    invalidArgumentsGeneratorReason,
  ] = useSelector(state => state.builder.validationStatuses.argumentsGenerator);
  const [isValidSolution, invalidSolutionReason] = useSelector(
    state => state.builder.validationStatuses.solution,
  );

  const templateState = useSelector(state => state.builder.templates.state);

  return (
    <div className="p-3">
      <p className="small">
        <TaskPropStatusIcon
          id="statusName"
          status={
            isValidName ? validationStatuses.valid : validationStatuses.invalid
          }
          reason={invalidNameReason}
        />
        Name
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusDescription"
          status={
            isValidDescription
              ? validationStatuses.valid
              : validationStatuses.invalid
          }
          reason={invalidDescriptionReason}
        />
        Description
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusSignature"
          status={
            !isValidInputSignature
              ? validationStatuses.invalid
              : mapStateToValidationStatus[taskCurrent.value]
          }
          reason={invalidInputReason}
        />
        Type Signatures
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusExamples"
          status={
            !isValidExamples
              ? validationStatuses.invalid
              : mapStateToValidationStatus[taskCurrent.value]
          }
          reason={invalidExamplesReason}
        />
        Examples
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusArgumentsGenerator"
          status={
            !isValidArgumentsGenerator
              ? validationStatuses.invalid
              : getGeneratorStatus(templateState, taskCurrent)
          }
          reason={invalidArgumentsGeneratorReason}
        />
        Input arguments generator
      </p>
      <p className="small">
        <TaskPropStatusIcon
          id="statusSolution"
          status={
            !isValidSolution
              ? validationStatuses.invalid
              : getGeneratorStatus(templateState, taskCurrent)
          }
          reason={invalidSolutionReason}
        />
        Solution Example
      </p>
    </div>
  );
});

export default BuilderStatus;
