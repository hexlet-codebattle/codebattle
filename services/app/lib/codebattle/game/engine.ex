defmodule Codebattle.Game.Engine do
  alias Codebattle.Bot
  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.User.Achievements
  alias Codebattle.UserGame
  alias CodebattleWeb.Api.GameView

  import Codebattle.Game.Auth
  require Logger

  @default_timeout div(:timer.minutes(30), 1000)
  @max_timeout div(:timer.hours(1), 1000)

  def create_game(params) do
    level = params[:level] || get_random_level()
    task = params[:task] || get_task(level)
    state = params[:state] || get_state_from_params(params)
    type = params[:type] || "duo"
    mode = params[:mode] || "standard"
    visibility_type = params[:visibility_type] || "public"
    timeout_seconds = params[:timeout_seconds] || @default_timeout
    [creator | _] = params.players
    tournament_id = params[:tournament_id]

    players =
      Enum.map(params.players, fn player ->
        Game.Player.build(player, %{creator: player.id == creator.id, task: task})
      end)

    with :ok <- check_auth(players, tournament_id),
         {:ok, game} <-
           insert_game(%{
             state: state,
             level: level,
             mode: mode,
             type: type,
             visibility_type: visibility_type,
             timeout_seconds: min(timeout_seconds, @max_timeout),
             tournament_id: tournament_id,
             task: task,
             players: players
           }),
         game = fill_virtual_fields(game),
         game = mark_as_live(game),
         {:ok, _} <- Game.GlobalSupervisor.start_game(game),
         :ok <- maybe_run_bot(game),
         :ok <- maybe_start_timeout_timer(game),
         :ok <- broadcast_live_game(game) do
      {:ok, game}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def join_game(game, user) do
    with :ok <- can_play_game?(user),
         {:ok, {_old_game, game}} <-
           Game.Server.call_transition(game.id, :join, %{
             players: game.players ++ [Game.Player.build(user, %{task: game.task})],
             starts_at: TimeHelper.utc_now()
           }),
         update_game!(game, %{state: "playing"}),
         :ok <- broadcast_live_game(game),
         :ok <- maybe_run_bot(game),
         :ok <- maybe_start_timeout_timer(game) do
      {:ok, game}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def check_result(game, params) do
    %{user: user, editor_text: editor_text, editor_lang: editor_lang} = params

    Game.Server.update_playbook(game.id, :start_check, %{
      id: user.id,
      editor_text: editor_text,
      editor_lang: editor_lang
    })

    check_result = checker_adapter().call(game.task, editor_text, editor_lang)

    Game.Server.update_playbook(game.id, :check_complete, %{
      id: user.id,
      check_result: check_result,
      editor_text: editor_text,
      editor_lang: editor_lang
    })

    case check_result.status do
      "ok" ->
        {:ok, {old_game, new_game}} =
          Game.Server.call_transition(game.id, :check_success, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        case {old_game.state, new_game.state} do
          {"playing", "game_over"} ->
            Game.Server.update_playbook(game.id, :game_over, %{id: user.id, lang: editor_lang})

            {:ok, _game} = store_result!(new_game)
            store_playbook(new_game)

            Codebattle.PubSub.broadcast("game:finished", %{game: new_game})
            {:ok, new_game, %{check_result: check_result, solution_status: true}}

          _ ->
            {:ok, new_game, %{check_result: check_result, solution_status: false}}
        end

      _ ->
        {:ok, {_old_game, new_game}} =
          Game.Server.call_transition(game.id, :check_failure, %{
            id: user.id,
            check_result: check_result,
            editor_text: editor_text,
            editor_lang: editor_lang
          })

        {:ok, new_game, %{check_result: check_result, solution_status: false}}
    end
  end

  def give_up(game, user) do
    case Game.Server.call_transition(game.id, :give_up, %{id: user.id}) do
      {:ok, {_old_game, new_game}} ->
        {:ok, _game} = store_result!(new_game)
        Codebattle.PubSub.broadcast("game:finished", %{game: new_game})
        store_playbook(new_game)
        {:ok, new_game}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def cancel_game(game, user) do
    with %Game.Player{} = player <- Game.Helpers.get_player(game, user.id),
         :ok <- player_can_cancel_game?(game, player),
         :ok <- terminate_game(game) do
      update_game!(game, %{state: "canceled"})
      :ok
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def terminate_game(%Game{} = game) do
    case game.is_live do
      true ->
        # TODO: move to PUbSub
        CodebattleWeb.Endpoint.broadcast("lobby", "game:remove", %{id: game.id})
        # Engine.store_playbook(game)
        Game.GlobalSupervisor.terminate_game(game.id)
        :ok

      _ ->
        :ok
    end
  end

  def rematch_send_offer(%{is_bot: true} = game, _user) do
    {:ok, new_game} = create_rematch_game(game)
    Game.GlobalSupervisor.terminate_game(game.id)

    {:rematch_accepted, new_game}
  end

  def rematch_send_offer(game, user) do
    {:ok, {_old_game, game}} =
      Game.Server.call_transition(game.id, :rematch_send_offer, %{player_id: user.id})

    case Game.Helpers.get_rematch_state(game) do
      "accepted" ->
        {:ok, new_game} = create_rematch_game(game)
        Game.GlobalSupervisor.terminate_game(game.id)

        {:rematch_accepted, new_game}

      _ ->
        {:rematch_status_updated, game}
    end
  end

  def update_editor_data(game, params) do
    case Game.Server.call_transition(game.id, :update_editor_data, params) do
      {:ok, {_old_game, game}} -> {:ok, game}
      {:error, reason} -> {:error, reason}
    end
  end

  def store_playbook(game) do
    {:ok, playbook} = Game.Server.get_playbook(game.id)
    Task.start(fn -> Bot.Playbook.store_playbook(playbook, game.id, game.task.id) end)
  end

  def get_task(level), do: tasks_provider().get_task(level)

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
          lang: player.editor_lang
        })

        achievements = Achievements.recalculate_achievements(player)

        update_user!(player.id, %{
          rating: player.rating,
          achievements: achievements,
          lang: player.editor_lang
        })
      end)

      update_game!(game, %{
        state: game.state,
        players: game.players,
        starts_at: Game.Helpers.get_starts_at(game),
        finishes_at: TimeHelper.utc_now()
      })
    end)
  end

  def update_user!(user_id, params) do
    Repo.get!(User, user_id)
    |> User.changeset(params)
    |> Repo.update!()
  end

  def update_game!(%Game{} = game) do
    case Repo.get(Game, game.id) do
      nil ->
        :ok

      game ->
        game
        |> Game.changeset(Map.from_struct(game))
        |> Repo.update!()
    end
  end

  def update_game!(%Game{} = game, params) do
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

  def trigger_timeout(%Game{} = game) do
    Logger.debug("Trigger timeout for game: #{game.id}")
    {:ok, {old_game, new_game}} = Game.Server.call_transition(game.id, :timeout, %{})

    case {old_game.state, new_game.state} do
      {s, "timeout"} when s in ["waiting_opponent", "playing"] ->
        Codebattle.PubSub.broadcast("game:finished", %{game: new_game})
        update_game!(new_game, %{state: "timeout"})
        terminate_game_after(game, 15)
        :ok

      _ ->
        :ok
    end
  end

  defp terminate_game_after(game, minutes) do
    Game.TimeoutServer.terminate_after(game.id, minutes)
  end

  defp maybe_start_timeout_timer(%{state: "playing"} = game) do
    Game.TimeoutServer.start_timer(game.id, game.timeout_seconds)
    :ok
  end

  defp maybe_start_timeout_timer(_game), do: :ok

  defp maybe_run_bot(%{state: "playing", is_bot: true} = game), do: Bot.start_bots(game)
  defp maybe_run_bot(_game), do: :ok

  def broadcast_live_game(game) do
    # TODO: move it to pubSub
    CodebattleWeb.Endpoint.broadcast!("lobby", "game:upsert", %{
      game: GameView.render_active_game(game)
    })

    :ok
  end

  def insert_game(params) do
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

  def get_state_from_params(%{type: "solo", players: [_user]}), do: "playing"
  def get_state_from_params(%{players: [_user1, _user2]}), do: "playing"
  def get_state_from_params(%{players: [_user]}), do: "waiting_opponent"

  defp tasks_provider do
    Application.get_env(:codebattle, :tasks_provider)
  end

  defp checker_adapter, do: Application.get_env(:codebattle, :checker_adapter)

  defp get_random_level, do: Enum.random(Codebattle.Task.levels())

  defp check_auth(players, nil), do: can_play_game?(players)
  defp check_auth(_, _), do: :ok

  defp mark_as_live(game), do: Map.put(game, :is_live, true)

  defp fill_virtual_fields(game) do
    %{
      game
      | is_bot: Game.Helpers.bot_game?(game),
        is_tournament: Game.Helpers.tournament_game?(game)
    }
  end
end
