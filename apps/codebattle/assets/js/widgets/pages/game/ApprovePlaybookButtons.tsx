import React, { useCallback, memo } from 'react';

import { Button, Group } from '@mantine/core';
import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';

import SolutionTypeCodes from '../../config/solutionTypes';
import { changePlaybookSolution } from '../../middlewares/Room';

interface ApprovePlaybookButtonsProps {
  playbookSolutionType: string;
}

function ApprovePlaybookButtons({ playbookSolutionType }: ApprovePlaybookButtonsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const approve = useCallback(() => {
    dispatch(changePlaybookSolution('approve'));
  }, [dispatch]);
  const reject = useCallback(() => {
    dispatch(changePlaybookSolution('reject'));
  }, [dispatch]);

  switch (playbookSolutionType) {
    case SolutionTypeCodes.waitingModerator:
      return (
        <Group grow wrap="nowrap">
          <Button variant="outline" radius="md" onClick={approve}>
            Approve
          </Button>
          <Button variant="outline" color="red" radius="md" onClick={reject}>
            Ban
          </Button>
        </Group>
      );
    case SolutionTypeCodes.complete:
      return (
        <>
          {/* <Button variant="outline" color="red" radius="md" fullWidth onClick={reject}> */}
          {/*   To banned list */}
          {/* </Button> */}
        </>
      );
    case SolutionTypeCodes.banned:
      return (
        <Button variant="outline" radius="md" fullWidth onClick={approve}>
          To approved list
        </Button>
      );
    default:
      return <></>;
  }
}

export default memo(ApprovePlaybookButtons);
