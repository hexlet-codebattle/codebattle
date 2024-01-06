import React, {
 useState, useCallback, useRef, useEffect, memo,
} from 'react';

import NiceModal, { useModal } from '@ebay/nice-modal-react';
import cn from 'classnames';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import LoadingStatusCodes from '../../config/loadingStatuses';
import ModalCodes from '../../config/modalCodes';
import {
  taskStateCodes,
  taskVisibilityCodes as TaskVisibilityCodes,
} from '../../config/task';
import { updateTaskVisibility } from '../../middlewares/Room';
import { actions } from '../../slices';

const TaskConfigurationModal = NiceModal.create(() => {
  const dispatch = useDispatch();

  const visibilityInputRef = useRef(null);

  const [configState, setConfigState] = useState(LoadingStatusCodes.IDLE);

  const task = useSelector(state => state.builder.task);

  const onError = useCallback(() => {
    setConfigState(LoadingStatusCodes.IDLE);
  }, [setConfigState]);

  const onChangeVisibility = useCallback(
    event => {
      if (configState === LoadingStatusCodes.LOADING) {
        return;
      }

      const nextVisibilityState = event.target.checked
        ? TaskVisibilityCodes.public
        : TaskVisibilityCodes.hidden;

      if (task.state === taskStateCodes.blank) {
        dispatch(actions.setTaskVisibility(nextVisibilityState));
      } else {
        setConfigState(LoadingStatusCodes.LOADING);
        dispatch(updateTaskVisibility(task.id, nextVisibilityState, onError));
      }
    },
    [dispatch, task, setConfigState, configState, onError],
  );

  const modal = useModal(ModalCodes.taskConfigurationModal);

  useEffect(() => {
    if (modal.visible) {
      visibilityInputRef.current.focus();
      setConfigState(LoadingStatusCodes.IDLE);
    }
  }, [modal.visible]);

  useEffect(() => {
    setConfigState(LoadingStatusCodes.IDLE);
  }, [task.visibility]);

  return (
    <Modal show={modal.visible} onHide={modal.hide}>
      <Modal.Header closeButton>
        <Modal.Title>Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div
          className={
            cn('d-flex custom-control custom-switch', {
              'text-muted': configState === LoadingStatusCodes.LOADING,
            })
          }
        >
          <input
            ref={visibilityInputRef}
            type="checkbox"
            className="custom-control-input"
            id="visibility"
            checked={task.visibility === TaskVisibilityCodes.public}
            onChange={onChangeVisibility}
          />
          <label className="custom-control-label" htmlFor="visibility">
            Available task for all users
          </label>
        </div>
      </Modal.Body>
    </Modal>
  );
});

export default memo(TaskConfigurationModal);
