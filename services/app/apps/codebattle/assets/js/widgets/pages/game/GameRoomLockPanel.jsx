import React, { useState, useRef, useCallback } from 'react';

import cn from 'classnames';
import { useDispatch } from 'react-redux';

import { sendPassCode } from '../../middlewares/Room';

const passCodeLength = 8;

function GameRoomLockPanel() {
  const dispatch = useDispatch();

  const inputRef = useRef(null);

  const [error, setError] = useState(null);

  const onChangePassCode = useCallback(() => {
    if (error) {
      setError(null);
    }
  }, [error, setError]);
  const onSubmitCode = useCallback(() => {
    const value = (inputRef.current.value || '').replaceAll(' ', '');
    const onError = err => setError(err);

    if (passCodeLength !== value.length) {
      onError({
        message: `Only ${passCodeLength} character pass code (now ${value.length})`,
      });
      return;
    }

    dispatch(sendPassCode(value, onError));
  }, [inputRef, setError, dispatch]);

  const inputClassName = cn('form-control', {
    'is-invalid': !!error,
  });

  return (
    <div className="d-flex flex-column w-50">
      <span className="text-center h3">Game is Locked</span>
      <div className="d-flex">
        <input
          ref={inputRef}
          id="game-lock"
          type="text"
          aria-label="Game lock input for pass code"
          placeholder="Enter pass code"
          className={inputClassName}
          onChange={onChangePassCode}
        />
        <button
          type="button"
          className="btn btn-sm btn-success rounded-lg text-white"
          onClick={onSubmitCode}
        >
          Submit
        </button>
      </div>
      <div className="d-flex flex-column flex-sm-row justify-content-between">
        <span className="text-muted m-1">Example: 12345678</span>
        {error && <span className="text-danger m-1">{error.message}</span>}
      </div>
    </div>
  );
}

export default GameRoomLockPanel;
