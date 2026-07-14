import { render } from '@testing-library/react';
import React from 'react';

const { channelLeave, dispatch, initPresence } = vi.hoisted(() => ({
  channelLeave: vi.fn(),
  dispatch: vi.fn(),
  initPresence: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (selector: (state: { gameUI: { followId: number } }) => unknown) =>
    selector({ gameUI: { followId: 42 } }),
}));

vi.mock('../widgets/middlewares/Main', () => ({
  default: initPresence,
}));

import MainChannelContainer from '../widgets/components/MainChannelContainer';

describe('MainChannelContainer', () => {
  test('keeps the browser-session presence channel alive when the page unmounts', () => {
    initPresence.mockReturnValue(() => ({ leave: channelLeave }));

    const { unmount } = render(<MainChannelContainer />);

    expect(initPresence).toHaveBeenCalledWith(42);
    expect(initPresence).toHaveBeenCalledTimes(1);

    unmount();

    expect(channelLeave).not.toHaveBeenCalled();
  });
});
