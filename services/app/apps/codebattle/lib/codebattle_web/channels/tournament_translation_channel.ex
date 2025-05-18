defmodule CodebattleWeb.TournamentTranslationChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.UserGameReport

  require Logger

  def join("tournament_translation:" <> tournament_id, _payload, socket) do
    current_user = socket.assigns.current_user

    with tournament when not is_nil(tournament) <-
           Tournament.Context.get!(tournament_id),
         true <- Helpers.can_moderate?(tournament, current_user) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:translation")

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

  def handle_info(%{event: "tournament:match:upserted", payload: payload}, socket) do
    push(socket, "tournament:match:upserted", %{match: payload.match, players: payload.players})

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_created", payload: payload}, socket) do
    push(socket, "tournament:round_created", %{
      tournament: payload.tournament
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:round_finished", payload: payload}, socket) do
    push(socket, "tournament:round_finished", %{
      tournament: payload.tournament
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:finished", payload: payload}, socket) do
    push(socket, "tournament:finished", %{
      tournament: payload.tournament
    })

    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:player:joined", payload: payload}, socket) do
    push(socket, "tournament:player:joined", payload)

    {:noreply, socket}
  end

  def handle_info(message, socket) do
    Logger.debug("Skip in translation message: " <> inspect(message))
    {:noreply, socket}
  end

  defp get_tournament_join_payload(tournament) do
    %{
      tournament: Helpers.prepare_to_json(tournament),
      active_game_id: 1
    }
  end
end
