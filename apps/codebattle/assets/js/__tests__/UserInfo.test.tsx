import React, { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import UserInfo from '../widgets/components/UserInfo';

const dispatch = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: () => ({ presenceList: [] }),
}));

vi.mock('../widgets/selectors', () => ({
  lobbyDataSelector: vi.fn(),
}));

vi.mock('../widgets/slices', () => ({
  actions: { setError: vi.fn() },
}));

vi.mock('../widgets/components/PopoverStickOnHover', () => ({
  default: ({ children, component }: { children: ReactNode; component: ReactNode }) => (
    <>
      {children}
      <div data-testid="popover-content">{component}</div>
    </>
  ),
}));

vi.mock('../widgets/components/UserName', () => ({
  default: ({ user }: { user: { name: string } }) => <span>{user.name}</span>,
}));

vi.mock('../widgets/components/UserStats', () => ({
  default: () => <div>user details</div>,
}));

describe('UserInfo', () => {
  test('renders only bot text in the tooltip without preloading user details', () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    render(<UserInfo user={{ id: -1, name: 'CodeBot', isBot: true }} />);

    expect(screen.getByTestId('popover-content')).toHaveTextContent(/^bot$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
