defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Bot
  alias Codebattle.Game
  alias Codebattle.Tournament
  alias CodebattleWeb.Api.GameView

  def join("lobby", _payload, socket) do
    current_user = socket.assigns.current_user

    user_active_games =
      %{is_tournament: false}
      |> Game.Context.get_active_games()
      |> Enum.filter(&can_user_see_game?(&1, current_user))

    Codebattle.PubSub.subscribe("games")
    Codebattle.PubSub.subscribe("tournaments")

    {:ok,
     %{
       active_games: user_active_games,
       tournaments: Tournament.Context.list_live_and_finished(socket.assigns.current_user),
       completed_games: GameView.render_completed_games(Game.Context.get_completed_games())
     }, socket}
  end

  def handle_in("game:cancel", payload, socket) do
    game_id = Map.get(payload, "game_id")

    Game.Context.cancel_game(game_id, socket.assigns.current_user)
    {:noreply, socket}
  end

  def handle_in("game:create", payload, socket) do
    players =
      case payload["opponent_type"] do
        "bot" ->
          [socket.assigns.current_user, Bot.Context.build()]

        "other_user" ->
          [socket.assigns.current_user]

        _ ->
          [socket.assigns.current_user]
      end

    game_params = %{
      level: payload["level"],
      timeout_seconds: payload["timeout_seconds"],
      players: players
    }

    case Game.Context.create_game(game_params) do
      {:ok, game} ->
        {:reply, {:ok, %{game_id: game.id}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_info(%{event: "game:finished", payload: payload}, socket) do
    push(socket, "game:remove", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "game:terminated", payload: payload}, socket) do
    push(socket, "game:remove", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "game:check_started", payload: payload}, socket) do
    push(socket, "game:check_started", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "game:check_completed", payload: payload}, socket) do
    push(socket, "game:check_completed", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "game:updated", payload: payload}, socket) do
    current_user = socket.assigns.current_user

    if can_user_see_game?(payload.game, current_user) do
      push(socket, "game:upsert", payload)
    end

    {:noreply, socket}
  end

  def hande_info(%{event: "tournament:created", payload: payload}, socket) do
    push(socket, "tournament:created", payload)
    {:noreply, socket}
  end

  def hande_info(%{event: "tournament:finished", payload: payload}, socket) do
    push(socket, "tournament:finished", payload)
    {:noreply, socket}
  end

  def handle_info(_, socket), do: {:noreply, socket}

  defp can_user_see_game?(game, user) do
    game.visibility_type == "public" || Game.Helpers.is_player?(game, user)
  end
end
