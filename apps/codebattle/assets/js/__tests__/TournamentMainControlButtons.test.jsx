import React from "react";

import "@testing-library/jest-dom";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";

import TournamentMainControlButtons from "../widgets/pages/tournament/TournamentMainControlButtons";

jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: "img",
}));

jest.mock("../widgets/middlewares/TournamentAdmin", () => ({
  cancelTournament: jest.fn(),
  finishTournament: jest.fn(),
  restartTournament: jest.fn(),
  retryTournament: jest.fn(),
  finishRoundTournament: jest.fn(),
  openUpTournament: jest.fn(),
  showTournamentResults: jest.fn(),
}));

function renderComponent(props = {}) {
  const store = configureStore({
    reducer: () => ({}),
  });

  const defaultProps = {
    accessType: "public",
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
    toggleShowBots: jest.fn(),
    handleStartRound: jest.fn(),
    handleOpenDetails: jest.fn(),
    toggleStreamMode: jest.fn(),
  };

  return render(
    <Provider store={store}>
      <TournamentMainControlButtons {...defaultProps} {...props} />
    </Provider>,
  );
}

test("shows Finish button for an active tournament even when restart is unavailable", () => {
  renderComponent();

  expect(screen.getByRole("button", { name: "Finish" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Finish Round" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Restart" })).not.toBeInTheDocument();
});

test("does not show Finish button for a finished tournament", () => {
  renderComponent({
    canFinishRound: false,
    canFinishTournament: false,
    canRestart: true,
  });

  expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Restart" })).toBeInTheDocument();
});
