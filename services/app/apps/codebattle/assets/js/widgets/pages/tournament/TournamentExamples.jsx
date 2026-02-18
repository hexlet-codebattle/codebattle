/**
 * Tournament Form Components - Usage Examples
 *
 * This file demonstrates how to use the tournament form components
 * to create and edit tournaments via React instead of LiveView.
 */

import React from "react";

import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import CreateTournament from "./CreateTournament";
import EditTournament from "./EditTournament";

/**
 * Example 1: Render Create Tournament Form
 *
 * Usage in a Phoenix template or HTML:
 *
 * <div id="create-tournament-root"
 *      data-task-pack-names='["Pack 1", "Pack 2"]'
 *      data-user-timezone="America/New_York">
 * </div>
 *
 * <script>
 *   renderCreateTournament('create-tournament-root');
 * </script>
 */
export const renderCreateTournament = (containerId, store) => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return;
  }

  const taskPackNames = JSON.parse(container.dataset.taskPackNames || "[]");
  const userTimezone = container.dataset.userTimezone || "UTC";

  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <CreateTournament taskPackNames={taskPackNames} userTimezone={userTimezone} />
    </Provider>,
  );
};

/**
 * Example 2: Render Edit Tournament Form
 *
 * Usage in a Phoenix template or HTML:
 *
 * <div id="edit-tournament-root"
 *      data-tournament-id="123"
 *      data-task-pack-names='["Pack 1", "Pack 2"]'
 *      data-user-timezone="America/New_York">
 * </div>
 *
 * <script>
 *   renderEditTournament('edit-tournament-root');
 * </script>
 */
export const renderEditTournament = (containerId, store) => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return;
  }

  const { tournamentId } = container.dataset;
  const taskPackNames = JSON.parse(container.dataset.taskPackNames || "[]");
  const userTimezone = container.dataset.userTimezone || "UTC";

  if (!tournamentId) {
    console.error("Tournament ID is required");
    return;
  }

  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <EditTournament
        tournamentId={tournamentId}
        taskPackNames={taskPackNames}
        userTimezone={userTimezone}
      />
    </Provider>,
  );
};

/**
 * Example 3: Direct Component Usage in React Application
 */
export function TournamentCreatePage({ store, taskPackNames, userTimezone }) {
  return (
    <Provider store={store}>
      <CreateTournament
        taskPackNames={taskPackNames}
        userTimezone={userTimezone}
        onSuccess={(tournament) => {
          console.log("Tournament created:", tournament);
          // Custom success handler
        }}
      />
    </Provider>
  );
}

export function TournamentEditPage({ store, tournamentId, taskPackNames, userTimezone }) {
  return (
    <Provider store={store}>
      <EditTournament
        tournamentId={tournamentId}
        taskPackNames={taskPackNames}
        userTimezone={userTimezone}
        onSuccess={(tournament) => {
          console.log("Tournament updated:", tournament);
          // Custom success handler
        }}
      />
    </Provider>
  );
}

/**
 * API Endpoints Used:
 *
 * CREATE:
 *   POST /api/v1/tournaments
 *   Body: { tournament: { name, description, starts_at, ... } }
 *   Response: { tournament: { id, name, ... } }
 *
 * UPDATE:
 *   PUT /api/v1/tournaments/:id
 *   Body: { tournament: { name, description, ... } }
 *   Response: { tournament: { id, name, ... } }
 *
 * FETCH (for edit):
 *   GET /api/v1/tournaments/:id
 *   Response: { tournament: { id, name, ... } }
 */

/**
 * Phoenix Controller Integration Example:
 *
 * In your Elixir controller:
 *
 * defmodule CodebattleWeb.TournamentController do
 *   def new(conn, _params) do
 *     current_user = conn.assigns.current_user
 *     task_pack_names = Codebattle.TaskPack.list_visible(current_user)
 *                       |> Enum.map(& &1.name)
 *     user_timezone = get_in(conn.private, [:connect_params, "timezone"]) || "UTC"
 *
 *     render(conn, "new.html",
 *       task_pack_names: task_pack_names,
 *       user_timezone: user_timezone
 *     )
 *   end
 *
 *   def edit(conn, %{"id" => id}) do
 *     current_user = conn.assigns.current_user
 *     tournament = Tournament.Context.get!(id)
 *     task_pack_names = Codebattle.TaskPack.list_visible(current_user)
 *                       |> Enum.map(& &1.name)
 *     user_timezone = get_in(conn.private, [:connect_params, "timezone"]) || "UTC"
 *
 *     render(conn, "edit.html",
 *       tournament_id: tournament.id,
 *       task_pack_names: task_pack_names,
 *       user_timezone: user_timezone
 *     )
 *   end
 * end
 *
 * In your templates (new.html.eex):
 *
 * <div id="create-tournament-root"
 *      data-task-pack-names="<%= Jason.encode!(@task_pack_names) %>"
 *      data-user-timezone="<%= @user_timezone %>">
 * </div>
 *
 * <script>
 *   import { renderCreateTournament } from './path/to/TournamentExamples';
 *   import store from './path/to/store';
 *   renderCreateTournament('create-tournament-root', store);
 * </script>
 */

export default {
  renderCreateTournament,
  renderEditTournament,
  TournamentCreatePage,
  TournamentEditPage,
};
