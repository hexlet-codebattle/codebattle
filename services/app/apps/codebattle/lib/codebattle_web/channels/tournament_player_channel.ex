defmodule CodebattleWeb.TournamentPlayerChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def join("tournament_player:" <> tournament_player_ids, payload, socket) do
    current_user = socket.assigns.current_user
    [tournament_id, player_id] = String.split(tournament_player_ids, "_")
    tournament_id = String.to_integer(tournament_id)
    player_id = String.to_integer(player_id)

    with tournament when not is_nil(tournament) <- Tournament.Context.get(tournament_id),
         true <- Tournament.Helpers.can_access?(tournament, current_user, payload) do
      Codebattle.PubSub.subscribe("tournament_player:#{tournament_id}_#{player_id}")
      Codebattle.PubSub.subscribe("tournament:#{tournament_id}")

      game_id = tournament |> Helpers.get_active_game_id(player_id)

      matches = Helpers.get_matches_by_players(tournament, [player_id])

      # TODO: Fix player_matches (no return default value: [])
      game_results =
        matches
        |> Enum.map(
          &(Codebattle.Game.Context.get_game!(&1.game_id)
            |> Codebattle.Game.Helpers.get_player_results()
            |> create_game_results(&1.game_id))
        )
        |> merge_results()

      {:ok,
       %{
         game_id: game_id,
         tournament_id: tournament_id,
         state: tournament.state,
         break_state: tournament.break_state,
         matches: matches,
         game_results: game_results
       }, assign(socket, tournament_id: tournament_id, player_id: player_id)}
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  def terminate(_reason, socket) do
    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_created", payload: payload}, socket) do
    push(socket, "tournament:round_created", %{
      state: payload.state,
      break_state: payload.break_state
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_finished", payload: payload}, socket) do
    matches =
      Enum.filter(payload.matches, &Helpers.is_match_player?(&1, socket.assigns.player_id))

    game_results =
      matches
      |> Enum.map(
        &(Codebattle.Game.Context.get_game!(&1.game_id)
          |> Codebattle.Game.Helpers.get_player_results()
          |> create_game_results(&1.game_id))
      )
      |> merge_results()

    push(socket, "tournament:round_finished", %{
      state: payload.state,
      break_state: payload.break_state,
      matches: matches,
      game_results: game_results
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "game:created", payload: payload}, socket) do
    push(socket, "game:created", %{game_id: payload.game_id})

    {:noreply, socket}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp create_game_results(results, game_id) do
    Map.new([{game_id, results}])
  end

  defp merge_results(results) do
    Enum.reduce(results, fn result, acc -> Map.merge(acc, result) end)
  end
end
