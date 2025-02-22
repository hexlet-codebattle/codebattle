defmodule CodebattleWeb.SpectatorChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament

  def join("spectator:" <> player_id, payload, socket) do
    current_user = socket.assigns.current_user
    player_id = String.to_integer(player_id)
    tournament_id = payload["tournament_id"]

    Codebattle.PubSub.subscribe("tournament:#{tournament_id}:player:#{player_id}")

    with tournament when not is_nil(tournament) <- Tournament.Context.get(tournament_id),
         true <- Tournament.Helpers.can_access?(tournament, current_user, payload) do
      game_id = Tournament.Helpers.get_active_game_id(tournament, player_id)
      matches = Tournament.Helpers.get_matches_by_players(tournament, [player_id])

      {:ok,
       %{
         active_game_id: game_id,
         type: tournament.type,
         tournament_id: tournament_id,
         state: tournament.state,
         break_state: tournament.break_state,
         current_round_position: tournament.current_round_position,
         matches: matches
       }, assign(socket, tournament_id: tournament_id, player_id: player_id)}
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def terminate(_reason, socket) do
    {:noreply, socket}
  end

  def handle_in(_topic, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:match:upserted", payload: payload}, socket) do
    if payload.match.state == "playing" do
      push(socket, "game:created", %{active_game_id: payload.match.game_id})
    end

    {:noreply, socket}
  end

  def handle_info(_, state), do: {:noreply, state}
end
