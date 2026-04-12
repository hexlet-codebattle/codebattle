/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost/users/42"}
 */
import React from "react";

import "@testing-library/jest-dom";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

import UserProfile from "../widgets/pages/profile";
import reducers from "../widgets/slices";

jest.mock(
  "gon",
  () => {
    const gonParams = { local: "en", current_user: { sound_settings: {} } };
    return { getAsset: (type) => gonParams[type] };
  },
  { virtual: true },
);

jest.mock("../i18n", () => ({
  __esModule: true,
  getLocale: jest.fn(() => "en"),
  getSupportedLocale: jest.fn((locale) => locale || "en"),
  default: {
    language: "en",
    t: jest.fn((key, params = {}) =>
      key.replace(/%\{(\w+)\}/g, (_, name) => String(params[name] ?? `%{${name}}`)),
    ),
  },
}));

jest.mock("../widgets/components/LanguageIcon", () => () => <span>lang-icon</span>);
jest.mock("../widgets/components/Loading", () => ({ small }) => (
  <div>{small ? "loading-small" : "loading"}</div>
));
jest.mock("../widgets/pages/profile/Heatmap", () => () => <div>heatmap</div>);
jest.mock("../widgets/pages/profile/UserStatCharts", () => () => <div>charts</div>);
jest.mock("../widgets/pages/profile/UserTournaments", () => () => <div>tournaments</div>);
jest.mock("../widgets/pages/lobby/CompletedGames", () => () => <div>completed-games</div>);

const reducer = combineReducers(reducers);

describe("UserProfile", () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active_game_id: null,
          achievements: [],
          metrics: {
            game_stats: { won: 3, lost: 1, gave_up: 0 },
            language_stats: { js: 2, ts: 2 },
            tournaments_stats: {
              rookie_wins: 0,
              challenger_wins: 0,
              pro_wins: 0,
              elite_wins: 0,
              masters_wins: 0,
              grand_slam_wins: 0,
            },
          },
          season_results: [],
          stats: { games: { won: 3, lost: 1, gave_up: 0 }, all: [] },
          user: {
            id: 42,
            name: "Kleria",
            avatar_url: "/assets/images/logo.svg",
            lang: "js",
            clan: "",
            clan_id: null,
            github_name: "Kleria",
            inserted_at: "2026-01-01T12:00:00Z",
            rating: 1500,
            rank: 10,
            points: 100,
            is_bot: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          top_rivals: [],
        }),
      });
  });

  test("does not render or request holopin resources on the profile page", async () => {
    const store = configureStore({ reducer });
    const { container, getByLabelText, queryByText } = render(
      <Provider store={store}>
        <UserProfile />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByLabelText("Github account")).toHaveAttribute("href", "https://github.com/Kleria");
    });

    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/v1/user/42/stats");
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/v1/user/42/rivals");
    expect(queryByText("Holopins")).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="https://holopin.io/@"]')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="https://holopin.me/@"]')).not.toBeInTheDocument();
  });
});
