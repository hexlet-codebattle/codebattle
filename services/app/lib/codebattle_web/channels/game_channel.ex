defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  # require Logger

  alias Codebattle.GameProcess.{Play, FsmHelpers}

  @after_join_game_attrs [
    :status,
    :players,
    :task,
    :starts_at,
    :joins_at,
    :timeout_seconds,
    :level
  ]

  def join("game:" <> game_id, _payload, socket) do
    case Play.game_info(game_id) do
      {:ok, game_info} ->
        send(self(), :after_join)
        {:ok, game_info, socket}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def handle_info(:after_join, socket) do
    game_id = get_game_id(socket)

    case Play.game_info(game_id) do
      {:ok, game_info} ->
        broadcast_from!(socket, "user:joined", Map.take(game_info, @after_join_game_attrs))
        {:noreply, socket}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  # This handle for test rematch:accept_offer
  def handle_info(_msg, socket) do
    {:noreply, socket}
  end

  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("editor:data", payload, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    editor_text = Map.get(payload, "editor_text", nil)
    lang = Map.get(payload, "lang", nil)

    case Play.update_editor_data(game_id, user, editor_text, lang) do
      :ok ->
        broadcast_from!(socket, "editor:data", %{
          user_id: user.id,
          lang_slug: lang,
          editor_text: editor_text
        })

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("give_up", _, socket) do
    game_id = get_game_id(socket)

    case Play.give_up(game_id, socket.assigns.current_user) do
      {:ok, fsm} ->
        message = socket.assigns.current_user.name <> " " <> gettext("gave up!")
        players = FsmHelpers.get_players(fsm)

        # TODO: send olny one game, and add it to game for completed games, and remove from active
        active_games =
          Play.active_games()
          |> Enum.map(fn {game_id, users, game_info} ->
            %{game_id: game_id, players: Map.values(users), game_info: game_info}
          end)

        completed_games = Enum.map(Play.completed_games(), &Play.get_completed_game_info/1)

        CodebattleWeb.Endpoint.broadcast_from!(self(), "lobby", "game:game_over", %{
          active_games: active_games,
          completed_games: completed_games
        })

        broadcast!(socket, "give_up", %{
          players: players,
          status: "game_over",
          msg: message
        })

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("rematch:send_offer", _, socket) do
    game_id = get_game_id(socket)
    current_user_id = socket.assigns.user_id

    with {:ok, fsm} <- Play.get_fsm(game_id) do
      case fsm.state do
        :rematch_in_approval ->
          handle_in("rematch:accept_offer", nil, socket)

        :game_over ->
          process_rematch_offer(game_id, current_user_id, socket)

        :timeout ->
          process_rematch_offer(game_id, current_user_id, socket)

        _ ->
          {:noreply, socket}
      end
    else
      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  def handle_in("rematch:reject_offer", _, socket) do
    game_id = get_game_id(socket)
    {:ok, new_fsm} = Play.rematch_reject(game_id)
    broadcast!(socket, "rematch:update_status", %{rematchState: new_fsm.data.rematch_state})
    {:noreply, socket}
  end

  def handle_in("rematch:accept_offer", _, socket) do
    game_id = get_game_id(socket)

    case Play.rematch_accept_offer(game_id) do
      {:ok, game_id} ->
        broadcast!(socket, "rematch:redirect_to_new_game", %{game_id: game_id})
        {:noreply, socket}

      _ ->
        {:reply, {:error, %{reason: "sww"}}, socket}
    end
  end

  def handle_in("check_result", payload, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    broadcast_from!(socket, "user:start_check", %{
      user: socket.assigns.current_user
    })

    editor_text = Map.get(payload, "editor_text", nil)
    lang = Map.get(payload, "lang", "js")

    case Play.check_game(game_id, user, editor_text, lang) do
      {:ok, fsm, result, output} ->
        winner = socket.assigns.current_user
        players = FsmHelpers.get_players(fsm)
        message = winner.name <> " " <> gettext("won the game!")

        active_games =
          Play.active_games()
          |> Enum.map(fn {game_id, users, game_info} ->
            %{game_id: game_id, players: Map.values(users), game_info: game_info}
          end)

        completed_games = Enum.map(Play.completed_games(), &Play.get_completed_game_info/1)

        push(socket, "user:check_result", %{
          solution_status: true,
          result: result,
          output: output,
          user_id: user.id,
          msg: message,
          status: fsm.state,
          players: players
        })

        CodebattleWeb.Endpoint.broadcast_from!(self(), "lobby", "game:game_over", %{
          active_games: active_games,
          completed_games: completed_games
        })

        broadcast_from!(socket, "user:finish_check", %{
          user: socket.assigns.current_user
        })

        broadcast_from!(socket, "output:data", %{
          user_id: user.id,
          result: result,
          output: output
        })

        broadcast_from!(socket, "user:won", %{
          players: players,
          status: "game_over",
          msg: message
        })

        {:noreply, socket}

      {:failure, result, failure_tests_count, success_tests_count, output} ->
        push(socket, "user:check_result", %{
          solution_status: false,
          result: result,
          output: output,
          asserts_count: success_tests_count + failure_tests_count,
          success_count: success_tests_count,
          user_id: user.id
        })

        broadcast_from!(socket, "user:finish_check", %{
          user: socket.assigns.current_user
        })

        broadcast_from!(socket, "output:data", %{
          user_id: user.id,
          result: result,
          output: output
        })

        {:noreply, socket}

      {:error, result, output} ->
        push(socket, "user:check_result", %{
          solution_status: false,
          result: result,
          output: output,
          user_id: user.id
        })

        broadcast_from!(socket, "user:finish_check", %{
          user: socket.assigns.current_user
        })

        broadcast_from!(socket, "output:data", %{
          user_id: user.id,
          result: result,
          output: output
        })

        {:noreply, socket}

      {:copypaste, result, output} ->
        push(socket, "user:copypaste_detected", %{
          user_id: user.id
        })

        broadcast_from!(socket, "output:data", %{
          user_id: user.id,
          result: result,
          output: output
        })

        {:noreply, socket}

      {:ok, result, output} ->
        push(socket, "user:check_result", %{
          solution_status: true,
          result: result,
          output: output,
          user_id: user.id
        })

        broadcast_from!(socket, "user:finish_check", %{
          user: socket.assigns.current_user
        })

        broadcast_from!(socket, "output:data", %{
          user_id: user.id,
          result: result,
          output: output
        })

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  defp process_rematch_offer(game_id, currentUserId, socket) do
    case Play.rematch_send_offer(game_id, currentUserId) do
      {:rematch_offer, rematch_data} ->
        broadcast!(socket, "rematch:update_status", rematch_data)
        {:noreply, socket}

      {:new_game, new_game_id} ->
        broadcast!(socket, "rematch:redirect_to_new_game", %{game_id: new_game_id})
        {:noreply, socket}

      {:no_free_bot} ->
        handle_in("rematch:reject_offer", nil, socket)

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}

      _ ->
        {:reply, {:error, %{reason: "sww"}}, socket}
    end
  end

  defp get_game_id(socket) do
    "game:" <> game_id = socket.topic
    game_id
  end
end
