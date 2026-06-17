defmodule CodebattleWeb.TournamentStreamerChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias CodebattleWeb.TournamentAdminChannel

  require Logger

  def join("tournament_streamer", _payload, socket) do
    with true <- socket.assigns[:streamer?] == true,
         tournament_id when not is_nil(tournament_id) <- socket.assigns[:tournament_id],
         tournament when not is_nil(tournament) <- Tournament.Context.get(tournament_id) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:stream")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}")
      Codebattle.PubSub.subscribe("game:tournament:#{tournament.id}")

      active_game_id =
        TournamentAdminChannel.get_active_game(tournament.id) ||
          first_playing_game_id(tournament)

      active_game = active_game_id && fetch_active_game(active_game_id)

      if active_game, do: Codebattle.PubSub.subscribe("game:#{active_game.id}")

      socket = assign(socket, :active_game_id, active_game && active_game.id)

      {:ok,
       %{
         tournament: tournament_state(tournament),
         active_game: active_game && render_active_game(active_game)
       }, socket}
    else
      false -> {:error, %{reason: "unauthorized"}}
      nil -> {:error, %{reason: "not_found"}}
    end
  end

  # Streamers don't push anything to the server.
  def handle_in(_topic, _payload, socket), do: {:noreply, socket}

  # Admin selected a new active game — re-subscribe and push fresh game info.
  def handle_info(%{event: "tournament:stream:active_game", payload: %{game_id: game_id}}, socket) do
    socket = switch_active_game(socket, game_id)
    {:noreply, socket}
  end

  # Any game in this tournament finished — push winner summary.
  def handle_info(%{event: "game:tournament:finished", payload: payload}, socket) do
    push(socket, "tournament:game:finished", %{
      game_id: payload.game_id,
      task_id: payload.task_id,
      game_state: payload.game_state,
      game_level: payload.game_level,
      duration_sec: payload.duration_sec,
      player_results: payload.player_results
    })

    {:noreply, socket}
  end

  # Test-run results changed on the currently active game.
  def handle_info(%{event: "game:check_completed", payload: payload}, socket) do
    if payload.game_id == socket.assigns[:active_game_id] do
      push(socket, "active_game:check_result", payload)
    end

    {:noreply, socket}
  end

  # Active game finished (push full payload + game-level player results).
  def handle_info(%{event: "game:finished", payload: %{game_id: game_id, game_state: state}}, socket) do
    if game_id == socket.assigns[:active_game_id] do
      case GameContext.fetch_game(game_id) do
        {:ok, game} ->
          push(socket, "active_game:finished", %{
            game_id: game_id,
            game_state: state,
            players: render_players(game)
          })

        _ ->
          push(socket, "active_game:finished", %{game_id: game_id, game_state: state})
      end
    end

    {:noreply, socket}
  end

  # Tournament-level lifecycle events — forward as compact state updates.
  def handle_info(%{event: event, payload: %{tournament: tournament}}, socket)
      when event in [
             "tournament:updated",
             "tournament:round_created",
             "tournament:round_finished",
             "tournament:finished",
             "tournament:restarted"
           ] do
    push(socket, event, %{tournament: tournament_state(tournament)})
    {:noreply, socket}
  end

  def handle_info(message, socket) do
    Logger.debug("Skip streamer message: " <> inspect(message))
    {:noreply, socket}
  end

  defp switch_active_game(socket, nil), do: socket

  defp switch_active_game(%{assigns: %{active_game_id: same}} = socket, same), do: socket

  defp switch_active_game(socket, new_game_id) do
    if old = socket.assigns[:active_game_id] do
      Codebattle.PubSub.unsubscribe("game:#{old}")
    end

    case fetch_active_game(new_game_id) do
      nil ->
        push(socket, "active_game:set", %{game_id: new_game_id, game: nil})
        assign(socket, :active_game_id, new_game_id)

      game ->
        Codebattle.PubSub.subscribe("game:#{game.id}")
        push(socket, "active_game:set", %{game_id: game.id, game: render_active_game(game)})
        assign(socket, :active_game_id, game.id)
    end
  end

  defp fetch_active_game(nil), do: nil

  defp fetch_active_game(game_id) do
    case GameContext.fetch_game(game_id) do
      {:ok, game} -> game
      _ -> nil
    end
  end

  defp first_playing_game_id(tournament) do
    case Helpers.get_matches(tournament, "playing") do
      [%{game_id: game_id} | _] when is_integer(game_id) -> game_id
      _ -> nil
    end
  end

  defp tournament_state(tournament) do
    Map.take(tournament, [
      :id,
      :name,
      :type,
      :state,
      :break_state,
      :show_results,
      :players_count,
      :current_round_position,
      :last_round_started_at,
      :last_round_ended_at,
      :starts_at,
      :finished_at
    ])
  end

  defp render_active_game(game) do
    %{
      id: Map.get(game, :id),
      level: Map.get(game, :level),
      state: Map.get(game, :state),
      starts_at: Map.get(game, :starts_at),
      finishes_at: Map.get(game, :finishes_at),
      timeout_seconds: Map.get(game, :timeout_seconds),
      duration_sec: Map.get(game, :duration_sec),
      tournament_id: Map.get(game, :tournament_id),
      task: render_task(game),
      players: render_players(game)
    }
  end

  defp render_task(%{task_type: "sql", sql_task: task}) when not is_nil(task), do: task_payload(task)
  defp render_task(%{task_type: "css", css_task: task}) when not is_nil(task), do: task_payload(task)
  defp render_task(%{task: task}) when not is_nil(task), do: task_payload(task)
  defp render_task(_), do: nil

  defp task_payload(task) do
    %{
      id: Map.get(task, :id),
      name: Map.get(task, :name),
      level: Map.get(task, :level),
      description_en: Map.get(task, :description_en),
      description_ru: Map.get(task, :description_ru),
      examples: Map.get(task, :examples),
      asserts_examples: Map.get(task, :asserts_examples, []),
      input_signature: Map.get(task, :input_signature, []),
      output_signature: Map.get(task, :output_signature, %{})
    }
  end

  defp render_players(game) do
    game
    |> Map.get(:players, [])
    |> Enum.map(fn p ->
      %{
        id: p.id,
        name: p.name,
        is_bot: Map.get(p, :is_bot, false),
        lang: Map.get(p, :editor_lang),
        rank: Map.get(p, :rank),
        rating: Map.get(p, :rating),
        result: Map.get(p, :result),
        check_result: Map.get(p, :check_result)
      }
    end)
  end
end
