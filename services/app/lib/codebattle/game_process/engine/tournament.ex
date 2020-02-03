defmodule Codebattle.GameProcess.Engine.Tournament do
  use Codebattle.GameProcess.Engine.Base

  alias Codebattle.Bot.PlaybookAsyncRunner

  alias Codebattle.GameProcess.{
    GlobalSupervisor,
    Fsm,
    Player,
    ActiveGames,
    TasksQueuesServer
  }

  alias Codebattle.{Repo, Game, User, Languages}

  def create_game(players, params) do
    level = "elementary"
    task = get_task(level, players)
    is_bot_game = Enum.any?(players, fn x -> x.is_bot end)

    game =
      Repo.insert!(%Game{state: "playing", level: level, type: "tournament", task_id: task.id})

    fsm =
      Fsm.new()
      |> Fsm.create_playing_game(%{
        players:
          Enum.map(players, fn player ->
            user = Repo.get(User, player.id)

            params = %{
              editor_lang: user.lang || "js",
              editor_text: Languages.get_solution(user.lang || "js", task)
            }

            Player.build(player, params)
          end),
        game_id: game.id,
        is_bot_game: is_bot_game,
        level: level,
        type: "tournament",
        starts_at: TimeHelper.utc_now(),
        task: task,
        tournament_id: params.tournament_id,
        timeout_seconds: params.timeout_seconds,
        joins_at: TimeHelper.utc_now()
      })

    ActiveGames.create_game(game.id, fsm)
    {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

    Enum.each(players, fn player ->
      if player.is_bot do
        PlaybookAsyncRunner.create_server(%{game_id: game.id, bot: player})

        PlaybookAsyncRunner.run!(%{
          game_id: game.id,
          task_id: task.id,
          bot_id: player.id,
          bot_time_ms: (50 * 3 + :rand.uniform(23)) * 1000
        })
      end
    end)

    start_timeout_timer(game.id, fsm)

    {:ok, fsm}
  end

  def get_task(level, [%{is_bot: false}, %{is_bot: false}]) do
    TasksQueuesServer.call_next_task(level)
  end

  def get_task(level, _players) do
    {:ok, task} = Codebattle.GameProcess.Engine.Bot.get_task(level)
    task
  end
end
