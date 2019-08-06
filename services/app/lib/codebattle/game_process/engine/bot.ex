defmodule Codebattle.GameProcess.Engine.Bot do
  import Codebattle.GameProcess.Engine.Base
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

  import Ecto.Query, warn: false
  # require Logger

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
            bots: true,
            type: type,
            timeout_seconds: 60 * 60,
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
    fsm = Play.get_fsm(game_id)
    level = FsmHelpers.get_level(fsm)
    first_player = FsmHelpers.get_first_player(fsm)

    case get_task(level) do
      {:ok, task} ->
        case Server.call_transition(game_id, :join, %{
               players: [
                 Player.rebuild(first_player, task),
                 Player.rebuild(second_player, task)
               ],
               task: task,
               joins_at: TimeHelper.utc_now()
             }) do
          {:ok, fsm} ->
            ActiveGames.add_participant(fsm)

            level = FsmHelpers.get_level(fsm)

            update_game!(game_id, %{state: "playing", task_id: task.id})
            start_record_fsm(game_id, FsmHelpers.get_players(fsm), fsm)
            run_bot!(fsm)

            Task.async(fn ->
              CodebattleWeb.Endpoint.broadcast!("lobby", "game:update", %{
                game: FsmHelpers.lobby_format(fsm)
              })
            end)

            start_timeout_timer(game_id, fsm)

            {:ok, fsm}

          {:error, reason} ->
            {:error, reason}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def run_bot!(fsm) do
    PlaybookAsyncRunner.run!(%{
      game_id: FsmHelpers.get_game_id(fsm),
      task_id: FsmHelpers.get_task(fsm).id,
      bot_id: FsmHelpers.get_first_player(fsm).id,
      opponent_data:
        get_opponent_task_data(FsmHelpers.get_second_player(fsm), FsmHelpers.get_level(fsm))
    })
  end

  def update_text(game_id, player, editor_text) do
    update_fsm_text(game_id, player, editor_text)
  end

  def update_lang(game_id, player, editor_lang) do
    update_fsm_lang(game_id, player, editor_lang)
  end

  def handle_won_game(game_id, winner, fsm) do
    loser = FsmHelpers.get_opponent(fsm, winner.id)

    store_game_result_async!(fsm, {winner, "won"}, {loser, "lost"})

    unless winner.is_bot do
      :ok = RecorderServer.store(game_id, winner.id)
    end

    ActiveGames.terminate_game(game_id)
  end

  def handle_give_up(game_id, loser, fsm) do
    winner = FsmHelpers.get_opponent(fsm, loser.id)

    store_game_result_async!(fsm, {winner, "won"}, {loser, "gave_up"})
    ActiveGames.terminate_game(game_id)
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

  defp get_opponent_task_data(player, game_level) do
    start_sequence_position = %{
      "elementary" => 300_000,
      "easy" => 500_000,
      "medium" => 800_000,
      "hard" => 1_500_000
    }

    end_sequence_position = %{
      "elementary" => 100_000,
      "easy" => 300_000,
      "medium" => 500_000,
      "hard" => 1_100_000
    }

    lower_level = 1000
    highest_level = 1500

    # 400
    sequence_step =
      div(
        start_sequence_position[game_level] - end_sequence_position[game_level],
        highest_level - lower_level
      )

    n = player.rating || 1000 - lower_level

    cond do
      player.rating <= lower_level -> start_sequence_position[game_level]
      player.rating > highest_level -> end_sequence_position[game_level]
      true -> start_sequence_position[game_level] - n * sequence_step
    end
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

        Task.async(fn ->
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
