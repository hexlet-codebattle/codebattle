defmodule Codebattle.GameProcess.Engine.Bot do
  use Codebattle.GameProcess.Engine.Base
  import Codebattle.GameProcess.Auth

  alias Codebattle.GameProcess.{
    Server,
    GlobalSupervisor,
    Player,
    FsmHelpers,
    ActiveGames
  }

  alias Codebattle.{Repo, Game}
  alias Codebattle.Bot.{Playbook, PlaybookAsyncRunner}
  alias CodebattleWeb.Notifications

  import Ecto.Query, warn: false

  # 1 hour
  @default_timeout 3600

  def create_game(%{user: user, level: level, type: type} = params) do
    player = Player.build(user, %{creator: true})
    timeout_seconds = params[:timeout_seconds] || @default_timeout
    game = Repo.insert!(%Game{state: "waiting_opponent", level: level, type: type})

    fsm =
      build_fsm(%{
        module: __MODULE__,
        players: [player],
        level: level,
        game_id: game.id,
        type: type,
        timeout_seconds: timeout_seconds,
        inserted_at: game.inserted_at
      })

    ActiveGames.create_game(fsm)
    {:ok, _} = GlobalSupervisor.start_game(fsm)

    {:ok, fsm}
  end

  def join_game(fsm, second_user) do
    with :ok <- player_can_join_game?(second_user),
         game_id <- FsmHelpers.get_game_id(fsm),
         level <- FsmHelpers.get_level(fsm),
         first_player <- FsmHelpers.get_first_player(fsm),
         {:ok, task} <- get_task(level),
         {:ok, fsm} <-
           Server.call_transition(game_id, :join, %{
             players: [
               Player.setup_editor_params(first_player, %{task: task}),
               Player.build(second_user, %{task: task})
             ],
             starts_at: TimeHelper.utc_now(),
             task: task
           }) do
      ActiveGames.update_game(fsm)

      update_game!(game_id, %{state: "playing", task_id: task.id})
      run_bot!(fsm)

      broadcast_active_game(fsm)

      start_timeout_timer(game_id, fsm)

      {:ok, fsm}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def run_bot!(fsm) do
    PlaybookAsyncRunner.run!(%{
      game_id: FsmHelpers.get_game_id(fsm),
      task_id: FsmHelpers.get_task(fsm).id,
      bot_id: FsmHelpers.get_first_player(fsm).id,
      bot_time_ms: get_bot_time(fsm)
    })
  end

  def handle_won_game(game_id, winner, fsm) do
    loser = FsmHelpers.get_opponent(fsm, winner.id)
    store_game_result!(fsm, {winner, "won"}, {loser, "lost"})
    ActiveGames.terminate_game(game_id)

    Notifications.notify_tournament(:game_over, fsm, %{
      state: "finished",
      game_id: game_id,
      winner: {winner.id, "won"},
      loser: {loser.id, "lost"}
    })

    :ok
  end

  def get_task(level) do
    query =
      from(
        playbook in Playbook,
        join: task in "tasks",
        on: task.id == playbook.task_id,
        order_by: fragment("RANDOM()"),
        preload: [:task],
        where: task.level == ^level,
        where: task.disabled == false,
        limit: 1
      )

    playbook = Repo.one(query)

    if playbook do
      %{task: task} = playbook
      {:ok, task}
    else
      {:error, :playbook_not_found}
    end
  end

  defp get_bot_time(fsm) do
    player = FsmHelpers.get_second_player(fsm)
    game_level = FsmHelpers.get_level(fsm)

    low_level_time = %{
      "elementary" => 60 * 3,
      "easy" => 60 * 5,
      "medium" => 60 * 7,
      "hard" => 60 * 9
    }

    high_level_time = %{
      "elementary" => 30,
      "easy" => 30 * 3,
      "medium" => 30 * 5,
      "hard" => 30 * 7
    }

    # y = f(x);
    # y: time, x: rating;
    # f(x) = k/(x  + b)

    x1 = 1400
    x2 = 800
    y1 = high_level_time[game_level]
    y2 = low_level_time[game_level]
    k = y1 * (x1 * y2 - x2 * y2) / (y2 - y1)
    b = (x1 * y1 - x2 * y2) / (y2 - y1)

    k / (player.rating + b) * 1000
  end

  def rematch_send_offer(game_id, user_id) do
    {:ok, fsm} = Server.call_transition(game_id, :rematch_send_offer, %{player_id: user_id})

    case FsmHelpers.get_rematch_state(fsm) do
      :in_approval ->
        {:ok, new_game_id} = create_rematch_game(fsm)

        {:rematch_new_game, %{game_id: new_game_id}}

      _ ->
        {:error, "undefined rematch state"}
    end
  end

  defp create_rematch_game(fsm) do
    level = FsmHelpers.get_level(fsm)
    type = FsmHelpers.get_type(fsm)
    timeout_seconds = FsmHelpers.get_timeout_seconds(fsm)
    {:ok, task} = get_task(level)

    players =
      fsm
      |> FsmHelpers.get_players()
      |> Enum.map(fn player -> Player.setup_editor_params(player, %{task: task}) end)

    game =
      Repo.insert!(%Game{
        state: "playing",
        level: level,
        type: type
      })

    fsm =
      build_fsm(%{
        module: __MODULE__,
        state: :playing,
        players: players,
        game_id: game.id,
        level: level,
        type: type,
        task: task,
        inserted_at: game.inserted_at,
        starts_at: game.inserted_at,
        timeout_seconds: timeout_seconds
      })

    ActiveGames.create_game(fsm)
    {:ok, _} = GlobalSupervisor.start_game(fsm)

    {:ok, _bot_pid} =
      PlaybookAsyncRunner.create_server(%{game_id: game.id, bot: FsmHelpers.get_first_player(fsm)})

    run_bot!(fsm)
    start_timeout_timer(game.id, fsm)
    broadcast_active_game(fsm)
    {:ok, game.id}
  end
end
