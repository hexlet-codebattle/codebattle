import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import TaskPreviewWidget from '../widgets/pages/taskPreview/TaskPreviewWidget';

test('shows the task solve time and base static score', () => {
  render(
    <TaskPreviewWidget
      task={{
        id: 1,
        name: 'score_task',
        level: 'easy',
        state: 'active',
        description_en: 'Solve it.',
        time_to_solve_sec: 125,
        base_score: 275,
      }}
      taskStats={null}
    />,
  );

  expect(screen.getByText('Time to solve')).toBeInTheDocument();
  expect(screen.getByText('2m 5s')).toBeInTheDocument();
  expect(screen.getByText('Base static score')).toBeInTheDocument();
  expect(screen.getByText('275')).toBeInTheDocument();
});
