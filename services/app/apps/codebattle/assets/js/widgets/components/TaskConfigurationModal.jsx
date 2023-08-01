import React, {
 useState, useCallback, useRef, useEffect, memo,
} from 'react';
import { Modal } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';
import { taskStateCodes, taskVisibilityCodes } from '../config/task';
import { actions } from '../slices';
import { updateTaskVisibility } from '../middlewares/Game';

const TaskConfigurationModal = memo(({ modalShowing, setModalShowing }) => {
  const dispatch = useDispatch();
  const visibilityInputRef = useRef(null);

  const [configState, setConfigState] = useState('init');

  const task = useSelector(state => state.builder.task);

  const onChangeVisibility = useCallback(
    event => {
      if (configState === 'loading') {
        return;
      }

      const nextVisibilityState = event.target.checked
        ? taskVisibilityCodes.public
        : taskVisibilityCodes.hidden;

      if (task.state === taskStateCodes.blank) {
        dispatch(actions.setTaskVisibility(nextVisibilityState));
      } else {
        const onError = () => setConfigState('init');

        setConfigState('loading');
        dispatch(updateTaskVisibility(task.id, nextVisibilityState, onError));
      }
    },
    [dispatch, task, setConfigState, configState],
  );

  const handleClose = useCallback(() => {
    setModalShowing(false);
  }, [setModalShowing]);

  useEffect(() => {
    if (modalShowing) {
      visibilityInputRef.current.focus();
      setConfigState('init');
    }
  }, [modalShowing]);

  useEffect(() => {
    setConfigState('init');
  }, [task.visibility]);

  return (
    <Modal show={modalShowing} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div
          className={
            cn('d-flex custom-control custom-switch', {
              'text-muted': configState === 'loading',
            })
          }
        >
          <input
            ref={visibilityInputRef}
            type="checkbox"
            className="custom-control-input"
            id="visibility"
            checked={task.visibility === taskVisibilityCodes.public}
            onChange={onChangeVisibility}
          />
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control, jsx-a11y/label-has-for */}
          <label className="custom-control-label" htmlFor="visibility">
            Available task for all users
          </label>
        </div>
      </Modal.Body>
    </Modal>
  );
});

export default TaskConfigurationModal;
