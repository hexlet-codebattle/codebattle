import React, { useCallback, memo } from 'react';

import { useDispatch } from 'react-redux';

import SolutionTypeCodes from '../../config/solutionTypes';
import { changePlaybookSolution } from '../../middlewares/Game';

function ApprovePlaybookButtons({ playbookSolutionType }) {
  const dispatch = useDispatch();
  const approve = useCallback(() => {
    dispatch(changePlaybookSolution('approve'));
  }, [dispatch]);
  const reject = useCallback(() => {
    dispatch(changePlaybookSolution('reject'));
  }, [dispatch]);

  switch (playbookSolutionType) {
    case SolutionTypeCodes.waitingModerator:
      return (
        <div className="d-flex btn-block">
          <button
            className="btn btn-outline-primary flex-grow-1 mr-1 rounded-lg"
            type="button"
            onClick={approve}
          >
            Approve
          </button>
          <button
            className="btn btn-outline-danger flex-grow-1 ml-1 rounded-lg"
            type="button"
            onClick={reject}
          >
            Ban
          </button>
        </div>
      );
    case SolutionTypeCodes.complete:
      return (
        <button
          className="btn btn-block btn-outline-danger rounded-lg"
          type="button"
          onClick={reject}
        >
          To baned list
        </button>
      );
    case SolutionTypeCodes.baned:
      return (
        <button
          className="btn btn-block btn-outline-primary rounded-lg"
          type="button"
          onClick={approve}
        >
          To approved list
        </button>
      );
    default:
      return null;
  }
}

export default memo(ApprovePlaybookButtons);
