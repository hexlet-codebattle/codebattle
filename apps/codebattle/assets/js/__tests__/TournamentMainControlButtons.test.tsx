import '@testing-library/jest-dom';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import TournamentMainControlButtons from '../widgets/pages/tournament/TournamentMainControlButtons';

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

vi.mock('../widgets/middlewares/TournamentAdmin', () => ({
  cancelTournament: vi.fn(),
  finishTournament: vi.fn(),
  restartTournament: vi.fn(),
  retryTournament: vi.fn(),
  finishRoundTournament: vi.fn(),
  openUpTournament: vi.fn(),
  showTournamentResults: vi.fn(),
}));

function renderComponent(props = {}) {
  const store = configureStore({
    reducer: () => ({}),
  });

  const defaultProps = {
    accessType: 'public',
    streamMode: false,
    tournamentId: 42,
    canStart: false,
    canStartRound: false,
    canFinishRound: true,
    canFinishTournament: true,
    canToggleShowBots: false,
    canRestart: false,
    showBots: true,
    hideResults: true,
    disabled: false,
    toggleShowBots: vi.fn(),
    handleStartRound: vi.fn(),
    handleOpenDetails: vi.fn(),
    toggleStreamMode: vi.fn(),
  };

  return render(
    <Provider store={store}>
      <TournamentMainControlButtons {...defaultProps} {...props} />
    </Provider>,
  );
}

test('shows Finish button for an active tournament even when restart is unavailable', () => {
  renderComponent();

  expect(screen.getByRole('button', { name: /Finish Tournament/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Finish Round/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Restart/ })).not.toBeInTheDocument();
});

test('does not show Finish button for a finished tournament', () => {
  renderComponent({
    canFinishRound: false,
    canFinishTournament: false,
    canRestart: true,
  });

  expect(screen.queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
});
