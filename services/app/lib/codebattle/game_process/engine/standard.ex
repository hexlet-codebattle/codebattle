defmodule Codebattle.GameProcess.Engine.Standard do
  import Codebattle.GameProcess.Engine.Base

  alias Codebattle.GameProcess.{
    Play,
    Server,
    GlobalSupervisor,
    Fsm,
    Player,
    FsmHelpers,
    Elo,
    ActiveGames,
    Notifier
  }

  alias Codebattle.{Repo, User, Game, UserGame}
  alias Codebattle.Bot.RecorderServer
  alias Codebattle.User.Achievements

  def create_game(player, %{"level" => level, "type" => type}) do
    game =
      Repo.insert!(%Game{
        state: "waiting_opponent",
        level: level,
        type: type
      })

    fsm =
      Fsm.new()
      |> Fsm.create(%{
        player: player,
        game_id: game.id,
        level: level,
        type: type,
        starts_at: TimeHelper.utc_now()
      })

    ActiveGames.create_game(game.id, fsm)
    {:ok, _} = GlobalSupervisor.start_game(game.id, fsm)

    Task.async(fn ->
      CodebattleWeb.Endpoint.broadcast("lobby", "game:new", %{game: fsm})
    end)

    case type do
      "public" ->
        Task.async(fn ->
          Notifier.call(:game_created, %{level: level, game: game, player: player})
        end)

      _ ->
        nil
    end

    {:ok, game.id}
  end

  def join_game(game_id, second_player) do
    game = Play.get_game(game_id)
    fsm = Play.get_fsm(game_id)
    first_player = FsmHelpers.get_first_player(fsm)

    task = get_random_task(game.level, [first_player.id, second_player.id])

    case Server.call_transition(game_id, :join, %{
           player: second_player,
           joins_at: TimeHelper.utc_now(),
           task: task
         }) do
      {:ok, fsm} ->
        ActiveGames.add_participant(fsm)

        # todo update second players in game
        game
        |> Game.changeset(%{state: "playing", task_id: task.id})
        |> Repo.update!()

        {:ok, _} = Codebattle.Bot.Supervisor.start_bot_record_server(game_id, first_player, fsm)
        {:ok, _} = Codebattle.Bot.Supervisor.start_bot_record_server(game_id, second_player, fsm)

        Notifier.call(:game_opponent_join, %{
          first_player: first_player,
          second_player: second_player,
          game_id: game_id
        })

        {:ok, fsm}

      {:error, reason, _fsm} ->
        {:error, reason}
    end
  end

  def update_text(game_id, player, editor_text) do
    RecorderServer.update_text(game_id, player.id, editor_text)

    Server.call_transition(game_id, :update_editor_params, %{
      id: player.id,
      editor_text: editor_text
    })
  end

  def update_lang(game_id, player, editor_lang) do
    RecorderServer.update_lang(game_id, player.id, editor_lang)

    Server.call_transition(game_id, :update_editor_params, %{
      id: player.id,
      editor_lang: editor_lang
    })

    update_user!(player, %{lang: editor_lang})
  end

  def handle_won_game(game_id, winner, fsm) do
    loser = FsmHelpers.get_opponent(fsm, winner.id)

    store_game_resuls_async!(fsm, {winner, "won"}, {loser, "lost"})
    :ok = RecorderServer.store(game_id, winner.id)
  end

  def handle_give_up(game_id, loser, fsm) do
    winner = FsmHelpers.get_opponent(fsm, loser.id)
    level = FsmHelpers.get_level(fsm)

    store_game_resuls_async!(fsm, {winner, "won"}, {loser, "gave_up"})
    ActiveGames.update_state(game_id, fsm)
    ActiveGames.list_games() |> IO.inspect()
  end

  defp get_random_task(level, user_ids) do
    qry = """
    WITH game_tasks AS (SELECT count(games.id) as count, games.task_id FROM games
    INNER JOIN "user_games" ON "user_games"."game_id" = "games"."id"
    WHERE "games"."level" = $1 AND "user_games"."user_id" IN ($2, $3)
    GROUP BY "games"."task_id")
    SELECT "tasks".*, "game_tasks".* FROM tasks
    LEFT JOIN game_tasks ON "tasks"."id" = "game_tasks"."task_id"
    WHERE "tasks"."level" = $1
    ORDER BY "game_tasks"."count" NULLS FIRST
    LIMIT 30
    """

    # TODO: get list and then get random in elixir

    res = Ecto.Adapters.SQL.query!(Repo, qry, [level, Enum.at(user_ids, 0), Enum.at(user_ids, 1)])

    cols = Enum.map(res.columns, &String.to_atom(&1))

    tasks =
      Enum.map(res.rows, fn row ->
        struct(Codebattle.Task, Enum.zip(cols, row))
      end)

    min_task = List.first(tasks)

    filtered_task = Enum.filter(tasks, fn x -> Map.get(x, :count) == min_task.count end)
    Enum.random(filtered_task)
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
