import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
} from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';
import { taskStateCodes } from '../../config/task';
import { taskTemplatesStates } from '../../utils/builder';
import { saveTask } from '../../middlewares/Game';
import { taskParamsSelector } from '../../selectors';
import SignaturePreview from './SignaturePreview';
import ExamplePreview from './ExamplePreview';

const taskSelector = taskParamsSelector();

function TaskConfirmationModal({ modalShowing, taskService }) {
  const dispatch = useDispatch();
  const confirmBtnRef = useRef(null);

  const [error, setError] = useState(null);

  const taskParams = useSelector(taskSelector);
  const templateState = useSelector(state => state.builder.templates.state);

  const handleConfirmation = useCallback(() => {
    dispatch(saveTask(taskService, setError));
  }, [taskService, dispatch]);

  const handleCancel = useCallback(() => {
    taskService.send('REJECT');
  }, [taskService]);

  useEffect(() => {
    if (modalShowing) {
      confirmBtnRef.current.focus();
    }
  }, [modalShowing]);

  if (taskParams.state === taskStateCodes.none) {
    return null;
  }

  const title = taskParams.state === taskStateCodes.blank
    ? 'Confirm task creation'
    : 'Confirm task changes';

  return (
    <Modal
      contentClassName="overflow-auto h-75"
      show={modalShowing}
      onHide={handleCancel}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-auto">
        <div className="d-flex flex-column">
          <div className="d-flex mb-2">
            <h6>{`Name: ${taskParams.name}`}</h6>
          </div>
          <div className="d-flex mb-2">
            <h6>{`Level: ${taskParams.level}`}</h6>
          </div>
          <div className="d-flex flex-column mb-2">
            <h6>Input: </h6>
            <div>
              {taskParams.inputSignature.map((input, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <SignaturePreview key={index} {...input} />
              ))}
            </div>
          </div>
          <div className="d-flex flex-column mb-2">
            <h6>Output:</h6>
            <div>
              <SignaturePreview {...taskParams.outputSignature} />
            </div>
          </div>
          <div className="d-flex flex-column">
            <h6>Asserts: </h6>
            <div>
              {taskParams.asserts.map((assert, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <ExamplePreview key={index} {...assert} />
              ))}
            </div>
          </div>
          {templateState === taskTemplatesStates.init && (
            <>
              <div className="d-flex flex-column my-2">
                <h6>Solution: </h6>
                <pre>
                  <code>{taskParams.solution}</code>
                </pre>
              </div>
              <div className="d-flex flex-column">
                <h6>Arguments Generator: </h6>
                <pre>
                  <code>{taskParams.argumentsGenerator}</code>
                </pre>
              </div>
            </>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <Button
            onClick={handleCancel}
            className="btn btn-secondary rounded-lg"
          >
            Cancel
          </Button>
          <div className="d-flex">
            {error && <div className="invalid-feedback">{error.message}</div>}
            <Button
              ref={confirmBtnRef}
              onClick={handleConfirmation}
              className="btn btn-success text-white rounded-lg"
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(TaskConfirmationModal);
