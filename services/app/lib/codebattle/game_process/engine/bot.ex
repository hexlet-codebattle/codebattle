defmodule Codebattle.GameProcess.Engine.Bot do
  use Codebattle.GameProcess.Engine.Base
  import Codebattle.GameProcess.Auth

  alias Codebattle.GameProcess.{
    Play,
    Server,
    GlobalSupervisor,
    Fsm,
    Player,
    FsmHelpers,
    ActiveGames
  }

  alias Codebattle.{Repo, Game}
  alias Codebattle.Bot.{RecorderServer, Playbook, PlaybookAsyncRunner}
  alias CodebattleWeb.Notifications

  import Ecto.Query, warn: false

  def create_game(bot, %{"level" => level, "type" => type}) do
    case player_can_create_game?(bot) do
      :ok ->
        bot_player = Player.build(bot, %{creator: true})

        game = Repo.insert!(%Game{state: "waiting_opponent", level: level, type: type})

        fsm =
          Fsm.new()
          |> Fsm.create(%{
            players: [bot_player],
            level: level,
            game_id: game.id,
            is_bot_game: true,
            type: type,
            timeout_seconds: 60 * 60 * 8,
            starts_at: TimeHelper.utc_now()
          })

        ActiveGames.create_game(game.id, fsm)
        {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

        {:ok, fsm}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def join_game(game_id, second_player) do
    with {:ok, fsm} <- Play.get_fsm(game_id),
         level <- FsmHelpers.get_level(fsm),
         first_player <- FsmHelpers.get_first_player(fsm),
         {:ok, task} <- get_task(level),
         {:ok, fsm} <-
           Server.call_transition(game_id, :join, %{
             players: [
               Player.rebuild(first_player, task),
               Player.rebuild(second_player, task)
             ],
             task: task,
             joins_at: TimeHelper.utc_now()
           }) do
      ActiveGames.add_participant(fsm)

      update_game!(game_id, %{state: "playing", task_id: task.id})
      start_record_fsm(game_id, FsmHelpers.get_players(fsm), fsm)
      run_bot!(fsm)

      Task.start(fn ->
        CodebattleWeb.Endpoint.broadcast!("lobby", "game:update", %{
          game: FsmHelpers.lobby_format(fsm)
        })
      end)

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

  def handle_won_game(game_id, winner, fsm, editor_text) do
    loser = FsmHelpers.get_opponent(fsm, winner.id)

    store_game_result!(fsm, {winner, "won"}, {loser, "lost"})

    unless winner.is_bot do
      RecorderServer.check_and_store_result(game_id, winner.id, editor_text)
    end

    ActiveGames.terminate_game(game_id)

    Notifications.notify_tournament(:game_over, fsm, %{
      state: "finished",
      game_id: game_id,
      winner: {winner.id, "won"},
      loser: {loser.id, "lost"}
    })

    :ok
  end

  def handle_give_up(game_id, loser, fsm) do
    winner = FsmHelpers.get_opponent(fsm, loser.id)

    store_game_result!(fsm, {winner, "won"}, {loser, "gave_up"})
    ActiveGames.terminate_game(game_id)

    Notifications.notify_tournament(:game_over, fsm, %{
      state: "finished",
      game_id: game_id,
      winner: {winner.id, "won"},
      loser: {loser.id, "gave_up"}
    })
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

  # TODO do create and join in one action
  def handle_rematch_offer_send(fsm, _user_id) do
    task = FsmHelpers.get_task(fsm)
    real_player = FsmHelpers.get_second_player(fsm) |> Player.rebuild(task)
    level = FsmHelpers.get_level(fsm)
    type = FsmHelpers.get_type(fsm)
    timeout_seconds = FsmHelpers.get_timeout_seconds(fsm)
    game_params = %{"level" => level, "type" => type, "timeout_seconds" => timeout_seconds}

    bot = Codebattle.Bot.Builder.build_free_bot()

    case create_game(bot, game_params) do
      {:ok, new_fsm} ->
        new_game_id = FsmHelpers.get_game_id(new_fsm)
        {:ok, _bot_pid} = PlaybookAsyncRunner.create_server(%{game_id: new_game_id, bot: bot})

        {:ok, new_fsm} = join_game(new_game_id, real_player)

        start_timeout_timer(new_game_id, new_fsm)

        Task.start(fn ->
          CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{
            game: FsmHelpers.lobby_format(new_fsm)
          })
        end)

        {:new_game, new_game_id}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
