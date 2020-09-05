defmodule Codebattle.GameProcess.Engine.Tournament do
  alias Codebattle.Bot

  alias Codebattle.Languages

  alias Codebattle.GameProcess.{
    GlobalSupervisor,
    Engine,
    ActiveGames,
    Player,
    Server
  }

  use Engine.Base

  @impl Engine.Base
  def create_game(%{players: players} = params) do
    level = params[:level] || "elementary"
    task = get_task(level)

    {:ok, game} =
      insert_game(%{
        state: "playing",
        type: "tournament",
        level: level,
        tournament_id: params.tournament.id,
        task_id: task.id
      })

    new_players = Enum.map(players, &Player.build(&1, %{task: task}))

    fsm =
      build_fsm(%{
        module: __MODULE__,
        state: :playing,
        players: new_players,
        game_id: game.id,
        level: level,
        type: "tournament",
        inserted_at: game.inserted_at,
        task: task,
        langs: Languages.get_langs_with_solutions(task),
        tournament_id: params.tournament.id,
        timeout_seconds: params.tournament.match_timeout_seconds,
        starts_at: TimeHelper.utc_now()
      })

    ActiveGames.create_game(fsm)
    {:ok, _} = GlobalSupervisor.start_game(fsm)

    Server.update_playbook(game.id, :join, %{players: new_players})

    Enum.each(new_players, fn player ->
      if player.is_bot do
        Bot.PlayersSupervisor.create_player(%{
          game_id: game.id,
          game_type: "tournament",
          task_id: task.id,
          bot_id: player.id,
          bot_time_ms: (50 * 3 + :rand.uniform(23)) * 1000
        })
      end
    end)

    start_timeout_timer(game.id, fsm)

    {:ok, fsm}
  end

  @impl Engine.Base
  def rematch_send_offer(_, _) do
    {:error, "Cannot create a rematch in a tournament"}
  end
end
