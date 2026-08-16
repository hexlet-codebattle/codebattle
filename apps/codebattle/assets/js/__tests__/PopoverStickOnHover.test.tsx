import React from 'react';

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import PopoverStickOnHover from '../widgets/components/PopoverStickOnHover';
import { theme } from '../widgets/ui/theme';

const renderWithMantine = (ui: React.ReactNode) =>
  render(
    <MantineProvider theme={theme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );

describe('PopoverStickOnHover', () => {
  test('reveals the popover content when hovering the target', async () => {
    const user = userEvent.setup();
    const component = <span>user details</span>;

    renderWithMantine(
      <PopoverStickOnHover id="user-info" delay={0} component={component}>
        <button type="button">Ada</button>
      </PopoverStickOnHover>,
    );

    expect(screen.queryByText('user details')).not.toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Ada' }));

    expect(await screen.findByText('user details')).toBeInTheDocument();
  });
});
