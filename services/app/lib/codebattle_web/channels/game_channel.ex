defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.GameProcess.{Play, FsmHelpers}
  alias Codebattle.UsersActivityServer
  alias CodebattleWeb.Api.GameView

  def join("game:" <> game_id, _payload, socket) do
    case Play.get_fsm(game_id) do
      {:ok, fsm} -> {:ok, GameView.render_fsm(fsm), socket}
      {:error, reason} -> {:error, reason}
    end
  end

  def terminate(_reason, socket) do
    game_id = get_game_id(socket)
    user_id = socket.assigns.current_user.id

    case Play.get_fsm(game_id) do
      {:ok, %{state: :playing} = fsm} ->
        UsersActivityServer.add_event(%{
          event: "leave_playing_game_room",
          user_id: user_id,
          data: %{
            game_id: game_id,
            is_player: FsmHelpers.is_player?(fsm, user_id)
          }
        })

      _ ->
        :ok
    end

    {:noreply, socket}
  end

  def handle_in("ping", payload, socket), do: {:reply, {:ok, payload}, socket}

  def handle_in("editor:data", payload, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    %{"editor_text" => editor_text, "lang_slug" => lang_slug} = payload

    case Play.update_editor_data(game_id, user, editor_text, lang_slug) do
      {:ok, _fsm} ->
        UsersActivityServer.add_event(%{
          event: "change_solution_game",
          user_id: user.id,
          data: %{
            game_id: game_id,
            lang: lang_slug
          }
        })

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
        UsersActivityServer.add_event(%{
          event: "give_up_game",
          user_id: user.id,
          data: %{
            game_id: game_id
          }
        })

        CodebattleWeb.Notifications.finish_active_game(fsm)

        broadcast!(socket, "user:give_up", %{
          players: FsmHelpers.get_players(fsm),
          status: FsmHelpers.get_state(fsm),
          msg: "#{user.name} gave up!"
        })

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
      {:ok, old_fsm, fsm, %{solution_status: solution_status, check_result: check_result}} ->
        UsersActivityServer.add_event(%{
          event: "check_solution",
          user_id: user.id,
          data: %{
            game_id: game_id,
            lang: lang_slug,
            solution_status: check_result.status,
            prev_game_state: FsmHelpers.get_state(old_fsm),
            next_game_state: FsmHelpers.get_state(fsm)
          }
        })

        broadcast!(socket, "user:check_complete", %{
          solution_status: solution_status,
          user_id: user.id,
          status: FsmHelpers.get_state(fsm),
          players: FsmHelpers.get_players(fsm),
          check_result: check_result
        })

        {:noreply, socket}

      {:error, reason} ->
        UsersActivityServer.add_event(%{
          event: "check_solution_error",
          user_id: user.id,
          data: %{
            game_id: game_id,
            lang: lang_slug,
            reason: reason
          }
        })

        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("rematch:send_offer", _, socket) do
    user = socket.assigns.current_user
    game_id = get_game_id(socket)

    UsersActivityServer.add_event(%{
      event: "rematch_send_offer_game",
      user_id: user.id,
      data: %{
        game_id: Integer.parse(game_id)
      }
    })

    game_id
    |> Play.rematch_send_offer(user.id)
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:reject_offer", _, socket) do
    game_id = get_game_id(socket)

    UsersActivityServer.add_event(%{
      event: "rematch_reject_offer_game",
      user_id: socket.assigns.current_user.id,
      data: %{
        game_id: Integer.parse(game_id)
      }
    })

    game_id
    |> Play.rematch_reject()
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:accept_offer", _, socket) do
    game_id = get_game_id(socket)
    user = socket.assigns.current_user

    UsersActivityServer.add_event(%{
      event: "rematch_accept_offer_game",
      user_id: user.id,
      data: %{
        game_id: Integer.parse(game_id)
      }
    })

    game_id
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
