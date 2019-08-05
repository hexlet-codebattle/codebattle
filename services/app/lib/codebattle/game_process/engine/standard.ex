defmodule Codebattle.GameProcess.Engine.Standard do
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

  alias Codebattle.{Repo, Game}
  alias Codebattle.Bot.RecorderServer

  def create_game(player, %{
        "level" => level,
        "type" => type,
        "timeout_seconds" => timeout_seconds
      }) do
    game =
      Repo.insert!(%Game{
        state: "waiting_opponent",
        level: level,
        type: type
      })

    fsm =
      Fsm.new()
      |> Fsm.create(%{
        players: [player],
        game_id: game.id,
        level: level,
        type: type,
        starts_at: TimeHelper.utc_now(),
        timeout_seconds: timeout_seconds
      })

    ActiveGames.create_game(game.id, fsm)
    {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

    case type do
      "public" ->
        Task.async(fn ->
          Notifier.call(:game_created, %{level: level, game: game, player: player})
        end)

      _ ->
        nil
    end

    {:ok, fsm}
  end

  def join_game(game_id, second_player) do
    fsm = Play.get_fsm(game_id)
    level = FsmHelpers.get_level(fsm)
    first_player = FsmHelpers.get_first_player(fsm)

    task = get_random_task(level, [first_player.id, second_player.id])

    case Server.call_transition(game_id, :join, %{
           players: [
             Player.rebuild(first_player, task),
             Player.rebuild(second_player, task)
           ],
           joins_at: TimeHelper.utc_now(),
           task: task
         }) do
      {:ok, fsm} ->
        ActiveGames.add_participant(fsm)

        update_game!(game_id, %{state: "playing", task_id: task.id})
        start_record_fsm(game_id, FsmHelpers.get_players(fsm), fsm)

        Task.async(fn ->
          Notifier.call(:game_opponent_join, %{
            first_player: FsmHelpers.get_first_player(fsm),
            second_player: FsmHelpers.get_second_player(fsm),
            game_id: game_id
          })
        end)

        {:ok, fsm}

      {:error, reason, _fsm} ->
        {:error, reason}
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
    :ok = RecorderServer.store(game_id, winner.id)
    ActiveGames.terminate_game(game_id)
  end

  def handle_give_up(game_id, loser, fsm) do
    winner = FsmHelpers.get_opponent(fsm, loser.id)
    store_game_result_async!(fsm, {winner, "won"}, {loser, "gave_up"})
    ActiveGames.terminate_game(game_id)
  end

  # defp update_game!(game_id, params) do
  #   game_id
  #   |> Play.get_game()
  #   |> Game.changeset(params)
  #   |> Repo.update!()
  # end

  # defp update_user!(user_id, params) do
  #   Repo.get!(User, user_id)
  #   |> User.changeset(params)
  #   |> Repo.update!()
  # end

  # defp create_user_game!(params) do
  #   Repo.insert!(UserGame.changeset(%UserGame{}, params))
  # end
end
