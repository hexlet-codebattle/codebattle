import { render } from '@testing-library/react';
import React from 'react';

const { dispatch, loadNearbyUsers } = vi.hoisted(() => ({
  dispatch: vi.fn(),
  loadNearbyUsers: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: () => undefined,
}));

vi.mock('../widgets/middlewares/Users', () => ({
  loadNearbyUsers,
}));

import { SeasonNearbyUsers } from '../widgets/pages/lobby/SeasonProfilePanel';

import { MantineTestProvider } from './helpers/mantine';

describe('SeasonNearbyUsers', () => {
  test('aborts the pending request with its AbortController when unmounted', () => {
    const { unmount } = render(
      <MantineTestProvider>
        <SeasonNearbyUsers user={{ id: 1, points: 10 }} nearbyUsers={[]} />
      </MantineTestProvider>,
    );
    const controller = loadNearbyUsers.mock.calls[0][0] as AbortController;

    expect(controller.signal.aborted).toBe(false);
    expect(() => unmount()).not.toThrow();
    expect(controller.signal.aborted).toBe(true);
  });
});
