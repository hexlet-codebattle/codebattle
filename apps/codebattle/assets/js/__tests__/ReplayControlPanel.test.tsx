import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import playbackModes from '../widgets/config/playbackModes';
import ControlPanel from '../widgets/pages/game/ControlPanel';

const { copyMock } = vi.hoisted(() => ({
  copyMock: vi.fn().mockResolvedValue(true),
}));

vi.mock('copy-to-clipboard', () => ({
  default: copyMock,
}));

const store = configureStore({
  reducer: (state = {}) => state,
});

const makeRoomState = (replayerState = 'on.paused', speedMode = '1x') => ({
  context: { speedMode },
  matches: ({ replayer }: { replayer: string }) => replayer === replayerState,
});

describe('replay control panel', () => {
  beforeEach(() => {
    copyMock.mockClear();
  });

  test('keeps clear playback controls visible while changing their values', async () => {
    const user = userEvent.setup();
    const onChangeSpeed = vi.fn();
    const onChangePlaybackMode = vi.fn();

    render(
      <Provider store={store}>
        <ControlPanel
          roomMachineState={makeRoomState()}
          onPauseClick={vi.fn()}
          onPlayClick={vi.fn()}
          onChangeSpeed={onChangeSpeed}
          playbackMode={playbackModes.realtime}
          onChangePlaybackMode={onChangePlaybackMode}
          nextRecordId={12}
          currentTime={2_000}
          totalDuration={10_000}
        >
          <div data-testid="timeline" />
        </ControlPanel>
      </Provider>,
    );

    expect(screen.getByRole('button', { name: 'Play replay' })).toBeInTheDocument();
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    expect(screen.getByLabelText('Playback time')).toHaveTextContent('00:02 / 00:10');
    expect(screen.queryByRole('slider', { name: 'Playback speed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Uniform' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replay settings' }));
    expect(screen.getByRole('dialog', { name: 'Replay settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Playback speed/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uniform' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Playback speed/ }));
    expect(screen.getByRole('button', { name: 'Back to replay settings' })).toBeInTheDocument();
    const speedSlider = screen.getByRole('slider', { name: 'Playback speed' });
    expect(speedSlider).toHaveAttribute('min', '0.5');
    expect(speedSlider).toHaveAttribute('max', '4');
    expect(speedSlider).toHaveAttribute('step', '0.5');

    fireEvent.change(speedSlider, { target: { value: '2.5' } });
    expect(onChangeSpeed).toHaveBeenCalledWith('2.5x');

    await user.click(screen.getByRole('button', { name: 'Set playback speed to 3×' }));
    expect(onChangeSpeed).toHaveBeenCalledWith('3x');

    await user.click(screen.getByRole('button', { name: 'Increase playback speed' }));
    expect(onChangeSpeed).toHaveBeenCalledWith('1.5x');

    await user.click(screen.getByRole('button', { name: 'Back to replay settings' }));
    await user.click(screen.getByRole('button', { name: 'Uniform' }));
    expect(onChangePlaybackMode).toHaveBeenCalledWith(playbackModes.standard);

    await user.click(screen.getByRole('button', { name: 'Copy replay link at current position' }));
    await waitFor(() => expect(copyMock).toHaveBeenCalledWith('http://localhost/?t=12'));
    expect(screen.getByText('Link copied')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replay settings' }));
    expect(screen.queryByRole('dialog', { name: 'Replay settings' })).not.toBeInTheDocument();
  });
});
