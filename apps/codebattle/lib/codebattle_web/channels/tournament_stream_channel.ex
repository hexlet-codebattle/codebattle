defmodule CodebattleWeb.TournamentStreamChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias CodebattleWeb.TournamentAdminChannel

  require Logger

  def join("stream:" <> tournament_id, _payload, socket) do
    current_user = socket.assigns.current_user

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get!(tournament_id),
         true <- Helpers.can_moderate?(tournament, current_user) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:stream")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}")

      {
        :ok,
        get_tournament_join_payload(tournament),
        socket
        |> assign(tournament_info: Helpers.tournament_info(tournament))
        |> assign(tournament_id: tournament.id)
      }
    else
      _ ->
        {:error, %{reason: "not_found"}}
    end
  end

  # skip all messages from the FE
  def handle_in(_topic, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:stream:active_game", payload: payload}, socket) do
    push(socket, "stream:active_game_selected", %{id: payload.game_id})
    {:noreply, socket}
  end

  def handle_info(%{event: event}, socket)
      when event in [
             "tournament:round_created",
             "tournament:updated",
             "tournament:match:upserted",
             "tournament:match:created"
           ] do
    maybe_push_active_game(socket)
    {:noreply, socket}
  end

  def handle_info(message, socket) do
    Logger.debug("Skip in stream message: " <> inspect(message))
    {:noreply, socket}
  end

  defp maybe_push_active_game(socket) do
    with tournament_id when not is_nil(tournament_id) <- socket.assigns[:tournament_id],
         tournament when not is_nil(tournament) <- Tournament.Context.get(tournament_id),
         active_game_id when not is_nil(active_game_id) <-
           TournamentAdminChannel.get_active_game(tournament_id) ||
             first_playing_game_id(tournament) do
      push(socket, "stream:active_game_selected", %{id: active_game_id})
    end
  end

  defp get_tournament_join_payload(tournament) do
    # Get the active game for this tournament from the TournamentAdminChannel agent
    active_game_id =
      TournamentAdminChannel.get_active_game(tournament.id) ||
        first_playing_game_id(tournament)

    %{
      tournament: Helpers.prepare_to_json(tournament),
      active_game_id: active_game_id
    }
  end

  defp first_playing_game_id(tournament) do
    case Helpers.get_matches(tournament, "playing") do
      [%{game_id: game_id} | _] when is_integer(game_id) -> game_id
      _ -> nil
    end
  end
end
