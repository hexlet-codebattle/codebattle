import React, {
 useState, useCallback, memo, useMemo, useEffect, useRef,
} from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import cn from 'classnames';
import copy from 'copy-to-clipboard';
import debounce from 'lodash/debounce';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import LoadingStatusCodes from '../../config/loadingStatuses';
import ModalCodes from '../../config/modalCodes';
import { taskStateCodes } from '../../config/task';
import { uploadTask, saveTask } from '../../middlewares/Room';
import * as selectors from '../../selectors';
import { taskTemplatesStates } from '../../utils/builder';

import ExamplePreview from './ExamplePreview';
import SignaturePreview from './SignaturePreview';

export const modalActions = {
  upload: 'upload',
  save: 'save',
  copy: 'copy',
  none: 'none',
};

export const modalModes = {
  preview: 'preview',
  showJSON: 'showJSON',
  editJSON: 'editJSON',
  none: 'none',
};

const getTitle = (action, taskParamsState) => {
  switch (action) {
    case 'upload':
      return 'Upload task json model';
    case 'copy':
      return 'Copy task json model';
    case 'save': {
      const title = taskParamsState === taskStateCodes.blank
        ? 'Confirm task creation'
        : 'Confirm task changes';
      return title;
    }
    case 'none': {
      return '';
    }
    default:
      throw new Error(`Unexpected task action type: ${action}`);
  }
};

const getBtnTitle = (action, state) => {
  if (state === LoadingStatusCodes.LOADING) {
    return 'Processing...';
  }

  switch (action) {
    case 'upload': return 'Upload task';
    case 'save': return 'Confirm';
    case 'copy': return 'Copy';
    case 'none': return '';
    default:
      throw new Error(`Unexpected task action type: ${action}`);
  }
};

const debouncedSetValue = debounce((value, setValue) => {
  setValue(value);
});

const taskParamsSelector = selectors.taskParamsSelector();

const TaskParamsModal = NiceModal.create(({
  taskService,
  mode: defaultMode = 'none',
  action = 'none',
}) => {
  const dispatch = useDispatch();

  const [mode, setMode] = useState(defaultMode);
  const [value, setValue] = useState('');
  const [error, setError] = useState();
  const [state, setState] = useState(LoadingStatusCodes.IDLE);

  const taskParamsRef = useRef(null);
  const submitBtnRef = useRef(null);

  const taskParams = useSelector(taskParamsSelector);
  const templateState = useSelector(selectors.taskParamsTemplatesStateSelector);

  const taskParamsJSON = JSON.stringify(
    omit(taskParams, ['creatorId', 'id', 'state']),
    null,
    2,
  );

  const title = useMemo(() => (
    getTitle(action, taskParams.state)
  ), [action, taskParams.state]);
  const btnTitle = useMemo(() => (
    getBtnTitle(action, state)
  ), [action, state]);

  const modal = useModal(ModalCodes.taskParamsModal);

  const getContentClassnameByMode = useCallback(currentMode => (
    cn('p-3', {
      'd-none': mode !== currentMode,
      'd-flex flex-column': mode === currentMode,
    })
  ), [mode]);

  const handleChangeMode = useCallback(
    event => {
      const nextMode = event.target.checked
        ? modalModes.showJSON
        : modalModes.preview;

      setMode(nextMode);
    },
    [setMode],
  );

  const handleChange = useCallback(event => {
    debouncedSetValue(event.target.value, setValue);
  }, [setValue]);

  const handleUpload = useCallback((...args) => {
    const data = JSON.parse(value);

    dispatch(uploadTask(data, ...args));
  }, [value, dispatch]);
  const handleSave = useCallback((...args) => {
    dispatch(saveTask(...args));
  }, [dispatch]);
  const handleCopy = useCallback(() => {
    copy(taskParamsJSON);
    setState(LoadingStatusCodes.IDLE);
    submitBtnRef.current.innerHTML = 'Copied';
  }, [taskParamsJSON, setState, submitBtnRef]);

  const handleSubmit = useCallback(() => {
    setError();
    setState(LoadingStatusCodes.LOADING);

    const onError = err => {
      setError(err);
      setState(LoadingStatusCodes.IDLE);
    };
    const onSuccess = () => {
      modal.hide();
      setState(LoadingStatusCodes.IDLE);
    };

    try {
      switch (action) {
        case 'upload': {
          handleUpload(taskService, onSuccess, onError);
          break;
        }
        case 'save': {
          handleSave(taskService, onSuccess, onError);
          break;
        }
        case 'copy': {
          handleCopy();
          break;
        }
        case 'none': break;
        default: throw new Error(`Unexpected task builder action type: ${action}`);
      }
    } catch (err) {
      setError(err);
    }
  }, [modal, action, taskService, handleUpload, handleSave, handleCopy]);

  const handleCancel = useCallback(() => {
    if (taskService) {
      taskService.send('REJECT');
    }

    modal.hide();
    setError();
  }, [taskService, modal]);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode, setMode]);

  useEffect(() => {
    if (modal.visible && !isEmpty(value) && action === modalActions.upload) {
      taskParamsRef.current.value = value;
    }

    if (modal.visible && isEmpty(value) && action === modalActions.upload) {
      taskParamsRef.current.value = taskParamsJSON;
    }

    if (modal.visible && action === modalActions.upload) {
      // taskParamsRef.current.focus();
      taskParamsRef.current.select();
    }

    if (!modal.visible) {
      setValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.visible]);

  if (taskParams.state === taskStateCodes.none) {
    return null;
  }

  return (
    <Modal
      size="lg"
      show={modal.visible}
      onHide={handleCancel}
      contentClassName="overflow-auto h-75"
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-auto">
        {error && (
          <Alert className="mt-2 mx-3 rounded-lg" variant="danger">
            <div className="overflow-auto h-25">
              {error.message}
              {error.request && (
                <>
                  <hr />
                  {error.request.response}
                </>
              )}
            </div>
          </Alert>
        )}
        <div className="d-flex justify-content-begin px-3">
          <div
            className={
              cn('d-flex custom-control custom-switch', {
                'text-muted': action !== modalActions.save,
              })
            }
          >
            <input
              id="task-params-view"
              type="checkbox"
              className="custom-control-input"
              checked={mode !== modalModes.preview}
              onChange={handleChangeMode}
              disabled={action !== modalActions.save}
            />
            <label className="custom-control-label" htmlFor="task-params-view">
              Show JSON
            </label>
          </div>
        </div>
        <div className={getContentClassnameByMode(modalModes.editJSON)}>
          <label className="" htmlFor="newTaskUpload">
            Enter task parameters in json model
          </label>
          <textarea
            ref={taskParamsRef}
            className="form-control bg-light w-100 rounded-lg"
            id="newTaskUpload"
            rows={15}
            onChange={handleChange}
          />
        </div>
        <div className={getContentClassnameByMode(modalModes.showJSON)}>
          <label className="" htmlFor="newTaskCopy">
            Check task parameters in json model
          </label>
          <pre id="newTaskCopy" className="bg-light rounded-lg p-3">
            {taskParamsJSON}
          </pre>
        </div>
        <div className={getContentClassnameByMode(modalModes.preview)}>
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
        <div className="d-flex justify-content-end w-100">
          <Button
            ref={submitBtnRef}
            className="btn btn-success text-white rounded-lg"
            onClick={handleSubmit}
            disabled={state === LoadingStatusCodes.LOADING}
          >
            {btnTitle}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
});

export default memo(TaskParamsModal);
