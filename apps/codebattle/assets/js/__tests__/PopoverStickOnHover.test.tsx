import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import PopoverStickOnHover from '../widgets/components/PopoverStickOnHover';

describe('PopoverStickOnHover', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('keeps the delayed hover timer across parent rerenders', () => {
    vi.useFakeTimers();

    const component = <span>user details</span>;
    const view = render(
      <PopoverStickOnHover id="user-info" delay={400} component={component}>
        <button type="button">Ada</button>
      </PopoverStickOnHover>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Ada' }));

    view.rerender(
      <PopoverStickOnHover id="user-info" delay={400} component={component}>
        <button type="button">Ada</button>
      </PopoverStickOnHover>,
    );

    act(() => vi.advanceTimersByTime(399));
    expect(screen.queryByText('user details')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('user details')).toBeInTheDocument();
  });
});
