defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game.Context
  alias CodebattleWeb.Api.GameView

  def join("game:" <> game_id, _payload, socket) do
    try do
      game = Context.get_game!(game_id)

      if game.tournament_id do
        Codebattle.PubSub.subscribe("tournament:#{game.tournament_id}")
      end

      {:ok, GameView.render_game(game), assign(socket, :game_id, game_id)}
    rescue
      Ecto.NoResultsError ->
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

  def handle_info(%{event: "tournament:round_created", payload: payload}, socket) do
    push(socket, "tournament:round_created", payload.tournament)

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

      _ ->
        {:reply, {:error, %{reason: "sww"}}, socket}
    end
  end
end
