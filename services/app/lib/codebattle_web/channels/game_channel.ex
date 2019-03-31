defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.GameProcess.{Play, FsmHelpers}

  def join("game:" <> game_id, _payload, socket) do
    send(self(), :after_join)
    game_info = Play.game_info(game_id)

    {:ok, game_info, socket}
  end

  def handle_info(:after_join, socket) do
    game_id = get_game_id(socket)
    game_info = Play.game_info(game_id)

    fields = [:status, :players, :task, :starts_at, :level]

    broadcast_from!(socket, "user:joined", Map.take(game_info, fields))
    {:noreply, socket}
  end

  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("editor:data", payload, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    %{"lang" => lang, "editor_text" => editor_text} = payload

    case Play.update_editor_data(game_id, user, editor_text, lang) do
      :ok ->
        broadcast_from!(socket, "editor:data", %{
          user_id: user.id,
          lang_slug: lang,
          editor_text: editor_text
        })

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end

    # if user_authorized_in_game?(game_id, user_id) do
    #   fsm = Play.get_fsm(game_id)
    #   {:noreply, socket}
    # else
    #   {:reply, {:error, %{reason: "not_authorized"}}, socket}
    # end
  end

  def handle_in("give_up", _, socket) do
    game_id = get_game_id(socket)

    if user_authorized_in_game?(game_id, socket.assigns.user_id) do
      fsm = Play.give_up(game_id, socket.assigns.current_user)
      message = socket.assigns.current_user.name <> " " <> gettext("gave up!")
      players = FsmHelpers.get_players(fsm)

      active_games =
        Play.list_games()
        |> Enum.map(fn {game_id, users, game_info} ->
          %{game_id: game_id, users: Map.values(users), game_info: game_info}
        end)

      completed_games = Play.completed_games()

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
    else
      {:reply, {:error, %{reason: "not_authorized"}}, socket}
    end
  end

  def handle_in("check_result", payload, socket) do
    game_id = get_game_id(socket)
    user_id = socket.assigns.user_id

    broadcast_from!(socket, "user:start_check", %{
      user: socket.assigns.current_user
    })

    if user_authorized_in_game?(game_id, socket.assigns.user_id) do
      %{"editor_text" => editor_text, "lang" => lang} = payload

      case Play.check_game(game_id, socket.assigns.current_user, editor_text, lang) do
        {:ok, fsm, result, output} ->
          winner = socket.assigns.current_user
          players = FsmHelpers.get_players(fsm)
          message = winner.name <> " " <> gettext("won the game!")

          active_games =
            Play.list_games()
            |> Enum.map(fn {game_id, users, game_info} ->
              %{game_id: game_id, users: Map.values(users), game_info: game_info}
            end)

          completed_games = Play.completed_games()

          push(socket, "user:check_result", %{
            solution_status: true,
            result: result,
            output: output,
            user_id: user_id,
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
            user_id: user_id,
            result: result,
            output: output
          })

          broadcast_from!(socket, "user:won", %{
            players: players,
            status: "game_over",
            msg: message
          })

          {:noreply, socket}

        {:error, result, output} ->
          push(socket, "user:check_result", %{
            solution_status: false,
            result: result,
            output: output,
            user_id: user_id
          })

          broadcast_from!(socket, "user:finish_check", %{
            user: socket.assigns.current_user
          })

          broadcast_from!(socket, "output:data", %{
            user_id: user_id,
            result: result,
            output: output
          })

          {:noreply, socket}

        {:ok, result, output} ->
          # TODO refactor this shit
          push(socket, "user:check_result", %{
            solution_status: true,
            result: result,
            output: output,
            user_id: user_id
          })

          broadcast_from!(socket, "user:finish_check", %{
            user: socket.assigns.current_user
          })

          broadcast_from!(socket, "output:data", %{
            user_id: user_id,
            result: result,
            output: output
          })

          {:noreply, socket}
      end
    else
      {:reply, {:error, %{reason: "not_authorized"}}, socket}
    end
  end

  defp get_game_id(socket) do
    "game:" <> game_id = socket.topic
    game_id
  end

  defp user_authorized_in_game?(game_id, user_id) do
    fsm = Play.get_fsm(game_id)
    FsmHelpers.player?(fsm, user_id)
  end
end
