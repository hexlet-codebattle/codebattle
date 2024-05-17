defmodule Codebattle.Game.Engine do
  require Logger

  import Codebattle.Game.Auth
  import Codebattle.Game.Helpers

  alias Codebattle.Bot
  alias Codebattle.CodeCheck
  alias Codebattle.Game
  alias Codebattle.Playbook
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGame

  @default_timeout div(:timer.minutes(30), 1000)
  @max_timeout div(:timer.hours(1), 1000)

  def create_game(params) do
    # TODO: add support for tags
    task =
      params[:task] ||
        Codebattle.Task.get_task_by_level(params[:level] || get_random_level())

    locked = Map.get(params, :locked, false)
    award = Map.get(params, :award, nil)
    use_chat = Map.get(params, :use_chat, true)
    use_timer = Map.get(params, :use_timer, true)
    state = params[:state] || get_state_from_params(params)
    type = params[:type] || "duo"
    mode = params[:mode] || "standard"
    # TODO: show it only after game finished
    # award_text = params[:award_text]
    visibility_type = params[:visibility_type] || "public"
    timeout_seconds = params[:timeout_seconds] || @default_timeout
    [creator | _] = params.players
    tournament_id = params[:tournament_id]
    players = build_players(params.players, task, creator)

    with :ok <- check_auth(players, mode, tournament_id),
         {:ok, game} <-
           insert_game(%{
             state: state,
             level: task.level,
             locked: locked,
             award: award,
             use_chat: use_chat,
             use_timer: use_timer,
             ref: params[:ref],
             round_id: params[:round_id],
             mode: mode,
             type: type,
             visibility_type: visibility_type,
             timeout_seconds: min(timeout_seconds, @max_timeout),
             tournament_id: tournament_id,
             waiting_room_name: params[:waiting_room_name],
             task: task,
             players: players,
             starts_at: TimeHelper.utc_now()
           }),
         game = fill_virtual_fields(game),
         game = mark_as_live(game),
         {:ok, _} <- Game.GlobalSupervisor.start_game(game),
         :ok <- maybe_fire_playing_game_side_effects(game),
         :ok <- broadcast_game_created(game) do
      {:ok, game}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  # for tournaments games to decrease db queries
  def bulk_create_games(games_params) do
    now = TimeHelper.utc_now()

    to_insert =
      Enum.map(games_params, fn params ->
        type = params[:type] || "duo"
        mode = params[:mode] || "standard"
        visibility_type = params[:visibility_type] || "public"

        task =
          params[:task] ||
            Codebattle.Task.get_task_by_level(params[:level] || get_random_level())

        %{
          level: task.level,
          mode: mode,
          players: build_players(params.players, task),
          ref: params[:ref],
          round_id: params[:round_id],
          starts_at: now,
          state: params.state,
          task_id: task.id,
          timeout_seconds: min(params.timeout_seconds, @max_timeout),
          tournament_id: params.tournament_id,
          type: type,
          waiting_room_name: params[:waiting_room_name],
          use_chat: params.use_chat,
          use_timer: params.use_timer,
          visibility_type: visibility_type,
          inserted_at: now,
          updated_at: now
        }
      end)

    Game
    |> Repo.insert_all(to_insert, returning: true)
    |> then(fn {_count, games} -> games end)
    |> Enum.zip(games_params)
    |> Enum.map(fn {game, params} ->
      game = fill_virtual_fields(game)
      game = mark_as_live(game)
      game = Map.put(game, :task, params.task)
      game = Map.put(game, :locked, params[:locked])
      game = Map.put(game, :award, params[:award])
      {:ok, _} = Game.GlobalSupervisor.start_game(game)
      :ok = maybe_fire_playing_game_side_effects(game)
      game
    end)
  end

  def join_game(game, user) do
    now = TimeHelper.utc_now()

    with :ok <- check_auth(user, game.mode, game.tournament_id),
         {:ok, {_old_game_state, game}} <-
           fire_transition(game.id, :join, %{
             players: game.players ++ [Game.Player.build(user, %{task: game.task})],
             starts_at: now
           }),
         update_game!(game, %{state: "playing", starts_at: now, task_id: game.task.id}),
         :ok <- maybe_fire_playing_game_side_effects(game),
         :ok <- broadcast_game_updated(game) do
      {:ok, game}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def check_result(game, params) do
    %{user: user, editor_text: editor_text, editor_lang: editor_lang} = params

    # TODO: maybe drop editor_text here
    Game.Server.update_playbook(game.id, :start_check, %{
      id: user.id,
      editor_text: editor_text,
      editor_lang: editor_lang
    })

    Codebattle.PubSub.broadcast("game:check_started", %{
      game: game,
      user_id: user.id
    })

    check_result = CodeCheck.check_solution(game.task, editor_text, editor_lang)

    # TODO: maybe drop editor_text here
    Codebattle.PubSub.broadcast("game:check_completed", %{
      game: game,
      user_id: user.id,
      check_result: check_result
    })

    Game.Server.update_playbook(game.id, :check_complete, %{
      id: user.id,
      check_result: check_result,
      editor_text: editor_text,
      editor_lang: editor_lang
    })

    case check_result.status do
      "ok" ->
        {:ok, {old_game_state, new_game}} =
          fire_transition(game.id, :check_success, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        case {old_game_state, new_game.state} do
          {"playing", "game_over"} ->
            Game.Server.update_playbook(game.id, :game_over, %{
              id: user.id,
              lang: editor_lang
            })

            {:ok, _game} = store_result!(new_game)
            store_playbook_async(new_game)

            Codebattle.PubSub.broadcast("game:finished", %{game: new_game})

            {:ok, new_game, %{check_result: check_result, solution_status: true}}

          _ ->
            {:ok, new_game, %{check_result: check_result, solution_status: false}}
        end

      _ ->
        {:ok, {_old_game_state, new_game}} =
          fire_transition(game.id, :check_failure, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        {:ok, new_game, %{check_result: check_result, solution_status: false}}
    end
  end

  def give_up(game, user) do
    case fire_transition(game.id, :give_up, %{id: user.id}) do
      {:ok, {_old_game_state, new_game}} ->
        {:ok, _game} = store_result!(new_game)
        Codebattle.PubSub.broadcast("game:finished", %{game: new_game})
        store_playbook_async(new_game)
        {:ok, new_game}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def cancel_game(game, user) do
    with %Game.Player{} = player <- get_player(game, user.id),
         :ok <- player_can_cancel_game?(game, player),
         :ok <- terminate_game(game) do
      update_game!(game, %{state: "canceled"})
      :ok
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def terminate_game(game = %Game{}) do
    case game.is_live do
      true ->
        store_playbook_async(game)
        Game.GlobalSupervisor.terminate_game(game.id)

        if game.tournament_id do
          :noop
        else
          Codebattle.PubSub.broadcast("game:terminated", %{game: game})
        end

        :ok

      _ ->
        :ok
    end
  end

  def rematch_send_offer(game = %{is_bot: true}, _user) do
    {:ok, new_game} = create_rematch_game(game)
    Game.GlobalSupervisor.terminate_game(game.id)

    {:rematch_accepted, new_game}
  end

  def rematch_send_offer(game, user) do
    {:ok, {_old_game_state, game}} =
      fire_transition(game.id, :rematch_send_offer, %{player_id: user.id})

    case get_rematch_state(game) do
      "accepted" ->
        {:ok, new_game} = create_rematch_game(game)
        Game.GlobalSupervisor.terminate_game(game.id)

        {:rematch_accepted, new_game}

      _ ->
        {:rematch_status_updated, game}
    end
  end

  def rematch_reject(game) do
    case fire_transition(game.id, :rematch_reject) do
      {:ok, {_old_game_state, new_game}} -> {:rematch_status_updated, new_game}
      {:error, reason} -> {:error, reason}
    end
  end

  def unlock_game(game) do
    fire_transition(game.id, :unlock_game)
  end

  def update_editor_data(game, params) do
    case fire_transition(game.id, :update_editor_data, params) do
      {:ok, {_old_game_state, game}} -> {:ok, game}
      {:error, reason} -> {:error, reason}
    end
  end

  def store_playbook_async(game) do
    {:ok, playbook_records} = Game.Server.get_playbook_records(game.id)

    Task.start(fn ->
      Playbook.Context.store_playbook(playbook_records, game.id)
    end)
  end

  def store_result!(game) do
    Repo.transaction(fn ->
      Enum.each(game.players, fn player ->
        create_user_game!(%{
          game_id: game.id,
          user_id: player.id,
          result: player.result,
          creator: player.creator,
          rating: player.rating,
          rating_diff: player.rating_diff,
          lang: player.editor_lang,
          playbook_id: Map.get(player, :playbook_id)
        })

        update_user!(player)
      end)

      update_game!(game, %{
        state: get_state(game),
        players: get_players(game),
        duration_sec: game.duration_sec,
        finishes_at: game.finishes_at
      })
    end)
  end

  def update_user!(%{is_guest: true}), do: :noop
  def update_user!(%{is_bot: true}), do: :noop

  def update_user!(player) do
    achievements = User.Achievements.recalculate_achievements(player)

    User
    |> Repo.get!(player.id)
    |> User.changeset(%{
      rating: player.rating,
      achievements: achievements,
      lang: player.editor_lang
    })
    |> Repo.update!()
  end

  def update_game!(game = %Game{}) do
    case Repo.get(Game, game.id) do
      nil ->
        :ok

      game ->
        game
        |> Game.changeset(Map.from_struct(game))
        |> Repo.update!()
    end
  end

  def update_game!(game = %Game{}, params) do
    case Repo.get(Game, game.id) do
      nil ->
        :ok

      game ->
        game
        |> Game.changeset(params)
        |> Repo.update!()
    end
  end

  def create_user_game!(params) do
    %UserGame{} |> UserGame.changeset(params) |> Repo.insert!()
  end

  def trigger_timeout(game = %Game{state: "game_over"}) do
    terminate_game_after(game, 1)
  end

  def trigger_timeout(game = %Game{}) do
    Logger.debug("Trigger timeout for game: #{game.id}")
    {:ok, {old_game_state, new_game}} = fire_transition(game.id, :timeout, %{})

    case {old_game_state, new_game.state} do
      {old_state, "timeout"}
      when old_state in ["waiting_opponent", "playing"] ->
        update_game!(new_game, %{
          state: get_state(new_game),
          players: get_players(new_game),
          duration_sec: new_game.duration_sec,
          finishes_at: new_game.finishes_at
        })

        if game.tournament_id do
          terminate_game_after(game, 1)
        else
          Codebattle.PubSub.broadcast("game:finished", %{game: new_game})
          terminate_game_after(game, 15)
        end

      _ ->
        :noop
    end

    :ok
  end

  defp maybe_fire_playing_game_side_effects(game = %{state: "playing"}) do
    init_playbook(game)
    run_bots(game)
    start_timeout_timer(game)
    :ok
  end

  defp maybe_fire_playing_game_side_effects(_game), do: :ok

  defp init_playbook(game) do
    Game.Server.init_playbook(game.id)
  end

  defp maybe_get_playbook_id_for_bot(_bot, nil), do: nil

  defp maybe_get_playbook_id_for_bot(%{is_bot: true}, task) do
    Playbook.Context.get_random_completed_id(task.id)
  end

  defp maybe_get_playbook_id_for_bot(_player, _task), do: nil

  defp run_bots(%{type: "solo"}), do: :noop
  defp run_bots(game), do: Bot.Context.start_bots(game)

  defp start_timeout_timer(game) do
    Game.TimeoutServer.start_timer(game.id, game.timeout_seconds)
  end

  defp broadcast_game_created(game) do
    Codebattle.PubSub.broadcast("game:created", %{game: game})
    :ok
  end

  defp broadcast_game_updated(game) do
    Codebattle.PubSub.broadcast("game:updated", %{game: game})
    :ok
  end

  defp terminate_game_after(game, minutes) do
    Game.TimeoutServer.terminate_after(game.id, minutes)
  end

  defp insert_game(params) do
    %Game{}
    |> Game.changeset(params)
    |> Repo.insert()
  end

  defp create_rematch_game(game) do
    create_game(%{
      level: game.level,
      type: game.type,
      mode: game.mode,
      visibility_type: game.visibility_type,
      timeout_seconds: game.timeout_seconds,
      players: game.players,
      state: "playing"
    })
  end

  defp get_state_from_params(%{type: "solo", players: [_user]}), do: "playing"
  defp get_state_from_params(%{players: [_user1, _user2]}), do: "playing"
  defp get_state_from_params(%{players: [_user]}), do: "waiting_opponent"

  defp get_random_level, do: Enum.random(Codebattle.Task.levels())

  defp check_auth(_, "training", _), do: :ok
  defp check_auth(_, _, tournament_id) when not is_nil(tournament_id), do: :ok
  defp check_auth(players, "standard", _), do: player_can_play_game?(players)

  defp fire_transition(game_id, transition, params \\ %{})

  defp fire_transition(game_id, transition, params) do
    Game.Server.fire_transition(game_id, transition, params)
  end

  defp build_players(players, task, creator \\ nil) do
    Enum.map(players, fn player ->
      Game.Player.build(player, %{
        creator: creator && player.id == creator.id,
        task: task,
        playbook_id: maybe_get_playbook_id_for_bot(player, task)
      })
    end)
  end
end
