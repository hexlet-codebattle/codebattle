import React, { type ReactNode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
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
  default: ({
    children,
    component,
    delay,
  }: {
    children: ReactNode;
    component: ReactNode;
    delay?: number;
  }) => (
    <>
      {children}
      <div data-delay={delay} data-testid="popover-content">
        {component}
      </div>
    </>
  ),
}));

vi.mock('../widgets/components/UserName', () => ({
  default: ({ user }: { user: { name: string } }) => <span>{user.name}</span>,
}));

vi.mock('../widgets/components/UserStats', () => ({
  default: ({ data }: { data?: unknown }) => (
    <div>{data ? 'loaded user details' : 'loading user details'}</div>
  ),
}));

describe('UserInfo', () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  test('renders only bot text in the tooltip without preloading user details', () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    render(<UserInfo user={{ id: -1, name: 'CodeBot', isBot: true }} />);

    expect(screen.getByTestId('popover-content')).toHaveTextContent(/^bot$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('delays user popovers and shares cached requests for the same user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ achievements: [], metrics: {} }),
    });
    globalThis.fetch = fetchMock;

    const view = render(
      <>
        <UserInfo user={{ id: 101, name: 'Ada' }} />
        <UserInfo user={{ id: 101, name: 'Ada' }} />
      </>,
    );

    expect(screen.getAllByTestId('popover-content')[0]).toHaveAttribute('data-delay', '150');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getAllByText('loaded user details')).toHaveLength(2);
    });

    view.unmount();
    render(<UserInfo user={{ id: 101, name: 'Ada' }} />);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('loaded user details')).toBeInTheDocument();
  });
});
