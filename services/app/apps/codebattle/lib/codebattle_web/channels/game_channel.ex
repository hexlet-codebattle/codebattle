defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game.Context
  alias CodebattleWeb.Api.GameView

  def join("game:" <> game_id, _payload, socket) do
    try do
      game = Context.get_game!(game_id)
      score = Context.fetch_score_by_game_id(game_id)

      if game.tournament_id do
        Codebattle.PubSub.subscribe(
          "tournament_player:#{game.tournament_id}_#{socket.assigns.current_user.id}"
        )
      end

      Codebattle.PubSub.subscribe("game:#{game.id}")

      {:ok, GameView.render_game(game, score), assign(socket, :game_id, game_id)}
    rescue
      _ ->
        {:ok, %{error: "Game not found"}, socket}
    end
  end

  def terminate(_reason, socket) do
    {:noreply, socket}
  end

  def handle_in("editor:data", payload, socket) do
    game_id = socket.assigns.game_id
    user = socket.assigns.current_user

    %{"editor_text" => editor_text, "lang_slug" => lang_slug} = payload

    case Context.update_editor_data(game_id, user, editor_text, lang_slug) do
      {:ok, _game} ->
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

  def handle_in("editor:cursor_position", payload, socket) do
    broadcast_from!(socket, "editor:cursor_position", %{
      user_id: socket.assigns.current_user.id,
      offset: payload["offset"]
    })

    {:noreply, socket}
  end

  def handle_in("editor:cursor_selection", payload, socket) do
    broadcast_from!(socket, "editor:cursor_selection", %{
      user_id: socket.assigns.current_user.id,
      start_offset: payload["start_offset"],
      end_offset: payload["end_offset"]
    })

    {:noreply, socket}
  end

  def handle_in("give_up", _, socket) do
    game_id = socket.assigns.game_id
    user = socket.assigns.current_user

    case Context.give_up(game_id, user) do
      {:ok, game} ->
        broadcast!(socket, "user:give_up", %{
          players: game.players,
          state: game.state,
          msg: "#{user.name} gave up!"
        })

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("check_result", payload, socket) do
    game_id = socket.assigns.game_id
    user = socket.assigns.current_user

    broadcast_from!(socket, "user:start_check", %{user_id: user.id})

    %{"editor_text" => editor_text, "lang_slug" => lang_slug} = payload

    case Context.check_result(game_id, %{
           user: user,
           editor_text: editor_text,
           editor_lang: lang_slug
         }) do
      {:ok, game, %{solution_status: solution_status, check_result: check_result}} ->
        broadcast!(socket, "user:check_complete", %{
          solution_status: solution_status,
          user_id: user.id,
          state: game.state,
          players: game.players,
          check_result: check_result
        })

        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("game:score", _, socket) do
    game_id = socket.assigns.game_id
    score = Context.fetch_score_by_game_id(game_id)

    {:reply, {:ok, %{score: score}}, socket}
  end

  def handle_in("rematch:send_offer", _, socket) do
    game_id = socket.assigns.game_id
    user = socket.assigns.current_user

    game_id
    |> Context.rematch_send_offer(user)
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:reject_offer", _, socket) do
    game_id = socket.assigns.game_id

    game_id
    |> Context.rematch_reject()
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:accept_offer", _, socket) do
    game_id = socket.assigns.game_id
    user = socket.assigns.current_user

    game_id
    |> Context.rematch_send_offer(user)
    |> handle_rematch_result(socket)
  end

  def handle_info(%{event: "game:terminated", payload: payload}, socket) do
    push(socket, "game:timeout", payload)
    {:noreply, socket}
  end

  def handle_info(%{event: "game:created", payload: payload}, socket) do
    push(socket, "tournament:game:created", %{game_id: payload.game_id})

    {:noreply, socket}
  end

  def handle_info(%{event: "game:finished", payload: payload}, socket) do
    if payload.game_state == "timeout" do
      push(socket, "game:timeout", payload)
    end

    {:noreply, socket}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp handle_rematch_result(result, socket) do
    case result do
      {:rematch_status_updated, game} ->
        broadcast!(socket, "rematch:status_updated", %{
          rematch_state: game.rematch_state,
          rematch_initiator_id: game.rematch_initiator_id
        })

        {:noreply, socket}

      {:rematch_accepted, game} ->
        broadcast!(socket, "rematch:accepted", %{game_id: game.id})
        {:noreply, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end
end
