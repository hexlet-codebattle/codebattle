defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.GameProcess.{Play, Fsm, FsmHelpers}

  def join("game:" <> game_id, _payload, socket) do
    send(self(), :after_join)
    game_info = Play.game_info(game_id)

    {:ok, game_info, socket}
  end

  def handle_info(:after_join, socket) do
    game_id = get_game_id(socket)
    game_info = Play.game_info(game_id)

    fields = [
      :status,
      :winner,
      :first_player,
      :second_player,
      :first_player_editor_text,
      :second_player_editor_text,
      :first_player_editor_lang,
      :second_player_editor_lang
    ]

    broadcast_from!(socket, "user:joined", Map.take(game_info, fields))
    {:noreply, socket}
  end

  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("editor:data", payload, socket) do
    user_id = socket.assigns.user_id
    game_id = get_game_id(socket)
    fsm = Play.get_fsm(game_id)
    lang_slug = FsmHelpers.get_user_lang(fsm, user_id)

    if user_authorized_in_game?(game_id, user_id) do
      %{"editor_text" => editor_text, "lang" => lang} = payload
      game_id = get_game_id(socket)
      # TODO: refactorme to update_editor_data in Play module
      Play.update_editor_text(game_id, user_id, editor_text)
      Play.update_editor_lang(game_id, user_id, lang)

      broadcast_from!(socket, "editor:data", %{
        user_id: user_id,
        lang_slug: lang_slug,
        editor_text: editor_text
      })

      {:noreply, socket}
    else
      {:reply, {:error, %{reason: "not_authorized"}}, socket}
    end
  end

  def handle_in("editor:lang", payload, socket) do
    game_id = get_game_id(socket)
    user_id = socket.assigns.user_id

    if user_authorized_in_game?(game_id, user_id) do
      %{"lang" => lang} = payload
      Play.update_editor_lang(game_id, user_id, lang)
      broadcast_from!(socket, "editor:lang", %{user_id: user_id, lang: lang})
      {:noreply, socket}
    else
      {:reply, {:error, %{reason: "not_authorized"}}, socket}
    end
  end

  def handle_in("give_up", payload, socket) do
    game_id = get_game_id(socket)

    if user_authorized_in_game?(game_id, socket.assigns.user_id) do
      Play.give_up(game_id, socket.assigns.current_user)
      fsm = Play.get_fsm(game_id)
      winner = FsmHelpers.get_winner(fsm)
      message = socket.assigns.current_user.name <> " " <> gettext("gave up!")

      broadcast!(socket, "give_up", %{
        winner: winner,
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

    if user_authorized_in_game?(game_id, socket.assigns.user_id) do
      %{"editor_text" => editor_text, "lang" => lang} = payload
      Play.update_editor_text(game_id, user_id, editor_text)
      Play.update_editor_lang(game_id, user_id, lang)

      case Play.check_game(game_id, socket.assigns.current_user, editor_text, lang) do
        {:ok, fsm} ->
          winner = socket.assigns.current_user

          msg =
            case fsm.state do
              :game_over ->
                message = winner.name <> " " <> gettext("won the game!")

                broadcast_from!(socket, "user:won", %{
                  winner: winner,
                  status: "game_over",
                  msg: message
                })

                message

              _ ->
                gettext("You lost the game")
            end

          {:reply, {:ok, %{solution_status: true, status: fsm.state, msg: msg, winner: winner}},
           socket}

        {:error, output} ->
          {:reply, {:ok, %{solution_status: false, output: output}}, socket}
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
    FsmHelpers.player?(fsm.data, user_id)
  end
end
