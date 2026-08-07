import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

import Message from '../widgets/components/Message';

import { MantineTestProvider } from './helpers/mantine';

vi.mock('react-redux', () => ({ useSelector: () => ({ name: 'General' }) }));

test('shows a delete action on the current user own message and calls back with its id', async () => {
  const user = userEvent.setup();
  const handleDelete = vi.fn();

  render(
    <MantineTestProvider>
      <Message
        id={7}
        name="Alice"
        userId={42}
        currentUserId={42}
        time={1}
        text="my message"
        onDeleteMessage={handleDelete}
      />
    </MantineTestProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'Delete message' }));
  expect(handleDelete).toHaveBeenCalledWith(7);
});

test('hides the delete action on another user message for a non-privileged user', () => {
  render(
    <MantineTestProvider>
      <Message
        id={7}
        name="Bob"
        userId={99}
        currentUserId={42}
        time={1}
        text="not mine"
        onDeleteMessage={vi.fn()}
      />
    </MantineTestProvider>,
  );

  expect(screen.queryByRole('button', { name: 'Delete message' })).not.toBeInTheDocument();
});

test('shows the delete action on another user message when the viewer can delete any', async () => {
  const user = userEvent.setup();
  const handleDelete = vi.fn();

  render(
    <MantineTestProvider>
      <Message
        id={7}
        name="Bob"
        userId={99}
        currentUserId={42}
        time={1}
        text="not mine"
        canDeleteAny
        onDeleteMessage={handleDelete}
      />
    </MantineTestProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'Delete message' }));
  expect(handleDelete).toHaveBeenCalledWith(7);
});
