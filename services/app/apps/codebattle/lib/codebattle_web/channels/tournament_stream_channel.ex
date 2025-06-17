defmodule CodebattleWeb.TournamentStreamChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  require Logger


  def join("stream:" <> tournament_id, _payload, socket) do
    current_user = socket.assigns.current_user

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get!(tournament_id),
         true <- Helpers.can_moderate?(tournament, current_user) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:stream")

      {
        :ok,
        get_tournament_join_payload(tournament),
        assign(socket, tournament_info: Helpers.tournament_info(tournament))
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


  def handle_info(message, socket) do
    Logger.debug("Skip in stream message: " <> inspect(message))
    {:noreply, socket}
  end

  defp get_tournament_join_payload(tournament) do
    %{
      tournament: Helpers.prepare_to_json(tournament),
      active_game_id: 1
    }
  end
end
