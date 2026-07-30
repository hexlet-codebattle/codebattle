import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { createActor } from 'xstate';

import RoomContext from '../widgets/components/RoomContext';
import GameStateCodes from '../widgets/config/gameStateCodes';
import machines from '../widgets/machines';
import ReplayerControlButton from '../widgets/pages/game/ReplayerControlButton';
import SignUpButton from '../widgets/pages/game/SignUpButton';

const { dispatchMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn((action) => {
    if (typeof action === 'function') {
      return action(dispatchMock);
    }

    return action;
  }),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => dispatchMock,
}));

vi.mock('../widgets/middlewares/Room', () => ({
  downloadPlaybook: (service: ReturnType<typeof createActor>) => () => {
    service.send({ type: 'START_LOADING_PLAYBOOK' });
    service.send({ type: 'LOAD_PLAYBOOK', payload: {} });
  },
  openPlaybook: (service: ReturnType<typeof createActor>) => () => {
    service.send({ type: 'OPEN_REPLAYER' });
  },
}));

describe('game action buttons', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  test('guest sign-up links to the registration page', () => {
    render(<SignUpButton />);

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/users/new');
  });

  test('opens and closes history with one click', async () => {
    const user = userEvent.setup();
    const mainService = createActor(machines.game, {
      input: { subscriptionType: 'premium' },
    });
    mainService.start();
    mainService.send({
      type: 'LOAD_GAME',
      payload: { state: GameStateCodes.gameOver },
    });

    render(
      <RoomContext.Provider value={{ mainService, taskService: mainService }}>
        <ReplayerControlButton />
      </RoomContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open Record Player' }));
    expect(screen.getByRole('button', { name: 'Close Record Player' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close Record Player' }));
    expect(screen.getByRole('button', { name: 'Open Record Player' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open Record Player' }));
    expect(screen.getByRole('button', { name: 'Close Record Player' })).toBeInTheDocument();

    act(() => mainService.stop());
  });
});
