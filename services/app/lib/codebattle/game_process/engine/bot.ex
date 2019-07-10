defmodule Codebattle.GameProcess.Engine.Bot do
  import Codebattle.GameProcess.Engine.Base

  alias Codebattle.GameProcess.{
    Play,
    Server,
    GlobalSupervisor,
    Fsm,
    Player,
    FsmHelpers,
    ActiveGames,
    Notifier
  }

  alias Codebattle.{Repo, User, Game, UserGame}
  alias Codebattle.Bot.{RecorderServer, Playbook}

  import Ecto.Query, warn: false

  def create_game(bot, %{"level" => level, "type" => type}) do
    bot_player = Player.build(bot, %{creator: true})

    game = Repo.insert!(%Game{state: "waiting_opponent", level: level, type: type})

    fsm =
      Fsm.new()
      |> Fsm.create(%{
        player: bot_player,
        level: level,
        game_id: game.id,
        bots: true,
        type: type,
        starts_at: TimeHelper.utc_now()
      })

    ActiveGames.create_game(game.id, fsm)
    {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

    {:ok, fsm}
  end

  def join_game(game_id, second_player) do
    fsm = Play.get_fsm(game_id)
    level = FsmHelpers.get_level(fsm)
    first_player = FsmHelpers.get_first_player(fsm)

    case get_playbook(level) do
      {:ok, %{task: task} = _playbook} ->

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

            Codebattle.Bot.PlaybookAsyncRunner.run!(%{
              game_id: game_id,
              task_id: task.id,
              opponent_data: get_opponent_task_data(second_player, level)
            })

            {:ok, fsm}

          {:error, _reason} ->
            {:error, _reason}
        end

      {:error, _reason} ->
        {:error, _reason}
    end
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

  def get_playbook(level) do
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
      {:ok, playbook}
    else
      {:error, :playbook_not_found}
    end
  end

  defp get_opponent_task_data(player, game_level) do
    start_sequence_position = %{
      "elementary" => 300_000,
      "easy" => 500_000,
      "middle" => 800_000,
      "hard" => 1_500_000}

    end_sequence_position = %{
      "elementary" => 100_000,
      "easy" => 300_000,
      "middle" => 500_000,
      "hard" => 1_100_000}

    lower_level = 1000
    highest_level = 1500

    sequence_step = div(start_sequence_position[game_level] - end_sequence_position[game_level], highest_level - lower_level)  #400
    n = player.rating || 1000 - lower_level
    cond do
      player.rating <= lower_level -> start_sequence_position[game_level]
      player.rating > highest_level -> end_sequence_position[game_level]
      true -> start_sequence_position[game_level] - n * sequence_step
    end
  end
end
