defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.GameProcess.{Play, FsmHelpers}
  alias CodebattleWeb.Api.GameView

  def join("game:" <> game_id, _payload, socket) do
    case Play.get_fsm(game_id) do
      {:ok, fsm} -> {:ok, GameView.render_fsm(fsm), socket}
      {:error, reason} -> {:error, reason}
    end
  end

  def handle_in("ping", payload, socket), do: {:reply, {:ok, payload}, socket}

  def handle_in("editor:data", payload, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    %{"editor_text" => editor_text, "lang_slug" => lang_slug} = payload

    case Play.update_editor_data(game_id, user, editor_text, lang_slug) do
      {:ok, _fsm} ->
        broadcast_from!(socket, "editor:data", %{
          user_id: user.id,
          lang_slug: lang_slug,
          editor_text: editor_text
        })

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("give_up", _, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    case Play.give_up(game_id, user) do
      {:ok, fsm} ->
        CodebattleWeb.Notifications.finish_active_game(fsm)
        players = FsmHelpers.get_players(fsm)
        [first_player, second_player] = players
        if first_player.is_bot and not second_player.is_bot do
          broadcast!(socket, "user:give_up", %{
            players: players,
            status: FsmHelpers.get_state(fsm),
            need_advice: true,
            msg: "#{user.name} gave up!"
          })
        else
          broadcast!(socket, "user:give_up", %{
            players: players,
            status: FsmHelpers.get_state(fsm),
            need_advice: false,
            msg: "#{user.name} gave up!"
          })
        end

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("check_result", payload, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    broadcast_from!(socket, "user:start_check", %{user_id: user.id})

    %{"editor_text" => editor_text, "lang_slug" => lang_slug} = payload

    case Play.check_game(game_id, user, editor_text, lang_slug) do
      {:ok, fsm, %{solution_status: solution_status, check_result: check_result}} ->
        broadcast!(socket, "user:check_complete", %{
          solution_status: solution_status,
          user_id: user.id,
          status: FsmHelpers.get_state(fsm),
          players: FsmHelpers.get_players(fsm),
          check_result: check_result
        })

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("rematch:send_offer", _, socket) do
    user = socket.assigns.current_user

    socket
    |> get_game_id
    |> Play.rematch_send_offer(user.id)
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:reject_offer", _, socket) do
    socket
    |> get_game_id
    |> Play.rematch_reject()
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:accept_offer", _, socket) do
    user = socket.assigns.current_user

    socket
    |> get_game_id
    |> Play.rematch_send_offer(user.id)
    |> handle_rematch_result(socket)
  end

  defp handle_rematch_result(result, socket) do
    case result do
      {:rematch_update_status, data} ->
        broadcast!(socket, "rematch:update_status", data)
        {:noreply, socket}

      {:rematch_new_game, data} ->
        broadcast!(socket, "rematch:redirect_to_new_game", data)
        {:noreply, socket}

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
