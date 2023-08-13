defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Bot
  alias Codebattle.Game
  alias CodebattleWeb.Api.LobbyView

  def join("lobby", _payload, socket) do
    current_user = socket.assigns.current_user

    params = LobbyView.render_lobby_params(current_user)

    Codebattle.PubSub.subscribe("games")
    Codebattle.PubSub.subscribe("tournaments")

    {:ok, params, socket}
  end

  def handle_in("game:cancel", payload, socket) do
    game_id = Map.get(payload, "game_id")

    Game.Context.cancel_game(game_id, socket.assigns.current_user)
    {:noreply, socket}
  end

  def handle_in("game:create", payload, socket) do
    user = socket.assigns.current_user

    game_params =
      %{
        level: payload["level"],
        timeout_seconds: payload["timeout_seconds"]
      }
      |> add_players(payload, user)
      |> maybe_add_task(payload, user)

    case Game.Context.create_game(game_params) do
      {:ok, game} ->
        {:reply, {:ok, %{game_id: game.id}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_info(%{event: "game:finished", payload: payload}, socket) do
    push(socket, "game:finished", payload)
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

  def handle_info(%{event: "tournament:created", payload: payload}, socket) do
    push(socket, "tournament:created", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:updated", payload: payload}, socket) do
    push(socket, "tournament:updated", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "tournament:finished", payload: payload}, socket) do
    push(socket, "tournament:finished", payload)
    {:noreply, socket}
  end

  def handle_info(_, socket), do: {:noreply, socket}

  defp can_user_see_game?(game, user) do
    game.visibility_type == "public" || Game.Helpers.is_player?(game, user)
  end

  defp add_players(acc, %{"opponent_type" => "bot"}, user),
    do: Map.put(acc, :players, [user, Bot.Context.build()])

  defp add_players(acc, _payload, user), do: Map.put(acc, :players, [user])

  defp maybe_add_task(params, %{"task_id" => nil, "task_tags" => []}, _user), do: params
  defp maybe_add_task(params, %{"task_id" => nil, "task_tags" => nil}, _user), do: params

  defp maybe_add_task(params, %{"task_id" => task_id}, user) when not is_nil(task_id) do
    case Codebattle.Task.get_task_by_id_for_user(user, task_id) do
      nil -> params
      task -> Map.put(params, :task, task)
    end
  end

  defp maybe_add_task(params, %{"task_tags" => task_tags}, user) when length(task_tags) > 0 do
    case Codebattle.Task.get_task_by_tags_for_user(user, task_tags) do
      nil -> params
      task -> Map.put(params, :task, task)
    end
  end

  defp maybe_add_task(params, _payload, _user), do: params
end
