defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game.{Play, GameHelpers}
  alias CodebattleWeb.Api.GameView

  def join("game:" <> game_id, _payload, socket) do
    case Play.get_fsm(game_id) do
      {:ok, fsm} ->
        Codebattle.PubSub.subscribe("tournaments")
        {:ok, GameView.render_fsm(fsm), assign(socket, :game_id, game_id)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def terminate(_reason, socket) do
    game_id = get_game_id(socket)
    user_id = socket.assigns.current_user.id

    # case Play.get_fsm(game_id) do
    #   {:ok, %{state: :playing} = fsm} ->
    #   _ ->
    #     :ok
    # end

    {:noreply, socket}
  end

  def handle_in("ping", payload, socket), do: {:reply, {:ok, payload}, socket}

  def handle_in("editor:data", payload, socket) do
    game_id = socket.assigns.game_id
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
    game_id = socket.assigns.game_id
    user = socket.assigns.current_user

    case Play.give_up(game_id, user) do
      {:ok, fsm} ->
        broadcast!(socket, "user:give_up", %{
          players: GameHelpers.get_players(fsm),
          status: GameHelpers.get_state(fsm),
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

    case Play.check_game(game_id, user, editor_text, lang_slug) do
      {:ok, old_fsm, fsm, %{solution_status: solution_status, check_result: check_result}} ->
        broadcast!(socket, "user:check_complete", %{
          solution_status: solution_status,
          user_id: user.id,
          status: GameHelpers.get_state(fsm),
          players: GameHelpers.get_players(fsm),
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
    |> Game.Context.rematch_send_offer(game_id, user)
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:reject_offer", _, socket) do
    game_id = socket.assigns.game_id

    game_id
    |> Play.rematch_reject()
    |> handle_rematch_result(socket)
  end

  def handle_in("rematch:accept_offer", _, socket) do
    game_id = socket.assigns.game_id
    user = socket.assigns.current_user

    game_id
    |> Play.rematch_send_offer(user.id)
    |> handle_rematch_result(socket)
  end

  def handle_info(%{topic: "tournaments", event: "round:created", payload: payload}, socket) do
    game_id = socket.assigns.game_id
    {:ok, fsm} = Play.get_fsm(game_id)

    if is_current_tournament?(payload.tournament, fsm) do
      push(socket, "tournament:round_created", payload.tournament)
    end

    {:noreply, socket}
  end

  defp is_current_tournament?(tournament, fsm) do
    GameHelpers.get_tournament_id(fsm) == tournament.id
  end

  defp handle_rematch_result(result, socket) do
    case result do
      {:ok, {:rematch_status_updated, game}} ->
        broadcast!(socket, "rematch:status_updated", %{
          rematch_state: game.rematch_state,
          rematch_initiator_id: game.rematch_initiator_id
        })

        {:noreply, socket}

      {:ok, {:rematch_accepted, game}} ->
        broadcast!(socket, "rematch:game_created", %{game_id: game.id})
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
