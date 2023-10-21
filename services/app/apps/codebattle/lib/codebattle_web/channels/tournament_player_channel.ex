defmodule CodebattleWeb.TournamentPlayerChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament_player:" <> tournament_player_ids, payload, socket) do
    current_user = socket.assigns.current_user
    [tournament_id, player_id] = String.split(tournament_player_ids, "_")

    with tournament when not is_nil(tournament) <- Tournament.Context.get(tournament_id),
         true <- Tournament.Helpers.can_access?(tournament, current_user, payload) do
      Codebattle.PubSub.subscribe("tournament_player:#{tournament_id}_#{player_id}")
      Codebattle.PubSub.subscribe("tournament:#{tournament_id}")
      active_match = Helpers.get_active_match(tournament, current_user)

      {:ok,
       %{
         active_match: active_match,
         tournament: tournament
       }, assign(socket, tournament_id: tournament_id, player_id: player_id)}
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def terminate(_reason, socket) do
    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_finished", payload: payload}, socket) do
    push(socket, "tournament:round_finished", payload)

    {:noreply, socket}
  end

  def handle_info(%{event: "game:created", payload: payload}, socket) do
    push(socket, "game:created", %{game_id: payload.game_id, player_id: payload.player_id})

    {:noreply, socket}
  end

  def handle_info(_, state), do: {:noreply, state}
end
